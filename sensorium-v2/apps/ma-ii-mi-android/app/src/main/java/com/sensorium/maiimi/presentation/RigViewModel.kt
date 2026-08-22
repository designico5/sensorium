package com.sensorium.maiimi.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sensorium.maiimi.data.DemoRigRepository
import com.sensorium.maiimi.data.EmptyStageRigRepository
import com.sensorium.maiimi.domain.ArtifactState
import com.sensorium.maiimi.domain.CanCommitPatchUseCase
import com.sensorium.maiimi.domain.Device
import com.sensorium.maiimi.domain.DeviceStatus
import com.sensorium.maiimi.domain.DownloadArtifact
import com.sensorium.maiimi.domain.RigRepository
import com.sensorium.maiimi.domain.SoundTrigger
import com.sensorium.maiimi.domain.Workspace
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

enum class PatchPhase { STAGED, ARMED, COMMITTED, REVERTED }

enum class TriggerFilter { ACAPELLAS, STEMS, MIDI }

data class RigUiState(
    val workspace: Workspace = Workspace.ROOM,
    val devices: List<Device> = emptyList(),
    val expectedDeviceCount: Int = 0,
    val triggers: List<SoundTrigger> = emptyList(),
    val artifacts: List<DownloadArtifact> = emptyList(),
    val demoMode: Boolean = false,
    val liveSafeArmed: Boolean = false,
    val patchPhase: PatchPhase = PatchPhase.STAGED,
    val patchMessage: String = "Patch is staged. Arm Live Safe to commit.",
    val auditioningId: String? = null,
    val selectedTriggerId: String? = null,
    val selectedTriggerFilter: TriggerFilter = TriggerFilter.ACAPELLAS,
    val auditionMessage: String = "Select a cue to hear the on-device preview tone.",
)

sealed interface RigEvent {
    data class SelectWorkspace(val workspace: Workspace) : RigEvent
    data object ToggleLiveSafe : RigEvent
    data object CommitPatch : RigEvent
    data object UndoPatch : RigEvent
    data class ToggleAudition(val triggerId: String) : RigEvent
    data class AuditionCompleted(val triggerId: String, val playbackStarted: Boolean) : RigEvent
    data class SelectTriggerFilter(val filter: TriggerFilter) : RigEvent
    data object RefreshDevices : RigEvent
    data object ToggleDemoMode : RigEvent
    data object AppBackgrounded : RigEvent
}

class RigViewModel(
    private val stageRepository: RigRepository = EmptyStageRigRepository(),
    private val demoRepository: RigRepository = DemoRigRepository(),
) : ViewModel() {
    private val canCommitPatch = CanCommitPatchUseCase()
    private var armTimeoutJob: Job? = null
    private var activeRepository: RigRepository = stageRepository

    private val initialDevices = activeRepository.devices()
    private val _state = MutableStateFlow(
        RigUiState(
            devices = initialDevices,
            expectedDeviceCount = initialDevices.size,
            triggers = activeRepository.triggers(),
            artifacts = activeRepository.artifacts(),
        ),
    )
    val state: StateFlow<RigUiState> = _state.asStateFlow()

    fun onEvent(event: RigEvent) {
        when (event) {
            is RigEvent.SelectWorkspace -> {
                if (event.workspace != Workspace.PATCH) cancelArmTimeout()
                _state.update { state ->
                    state.copy(
                        workspace = event.workspace,
                        liveSafeArmed = if (event.workspace == Workspace.PATCH) state.liveSafeArmed else false,
                        patchPhase = if (event.workspace == Workspace.PATCH) state.patchPhase else disarmedPhase(state.patchPhase),
                        auditioningId = if (event.workspace == Workspace.AUDITION) state.auditioningId else null,
                    )
                }
            }
            RigEvent.ToggleLiveSafe -> {
                _state.update { state ->
                    if (state.patchPhase == PatchPhase.COMMITTED) {
                        state.copy(patchMessage = "Undo the committed preview before staging another patch.")
                    } else {
                        val armed = !state.liveSafeArmed
                        state.copy(
                            liveSafeArmed = armed,
                            patchPhase = if (armed) PatchPhase.ARMED else PatchPhase.STAGED,
                            patchMessage = if (armed) "Live Safe armed for 15 seconds — commit remains reversible." else "Patch is staged. Arm Live Safe to commit.",
                        )
                    }
                }
                if (_state.value.liveSafeArmed) scheduleArmTimeout() else cancelArmTimeout()
            }
            RigEvent.CommitPatch -> {
                commitPatch()
                if (!_state.value.liveSafeArmed) cancelArmTimeout()
            }
            RigEvent.UndoPatch -> {
                cancelArmTimeout()
                _state.update { state ->
                    if (state.patchPhase == PatchPhase.COMMITTED) {
                        state.copy(
                            liveSafeArmed = false,
                            patchPhase = PatchPhase.REVERTED,
                            patchMessage = "Reverted to the last known-safe preview scene.",
                        )
                    } else {
                        state.copy(
                            liveSafeArmed = false,
                            patchPhase = disarmedPhase(state.patchPhase),
                            patchMessage = "Undo unavailable — no committed patch exists.",
                        )
                    }
                }
            }
            is RigEvent.ToggleAudition -> _state.update { state ->
                val isAlreadyPlaying = state.auditioningId == event.triggerId
                state.copy(
                    auditioningId = if (isAlreadyPlaying) null else event.triggerId,
                    selectedTriggerId = event.triggerId,
                    auditionMessage = if (isAlreadyPlaying) "Cue stopped." else "Starting cue preview…",
                )
            }
            is RigEvent.AuditionCompleted -> _state.update { state ->
                if (state.auditioningId == event.triggerId) {
                    state.copy(
                        auditioningId = null,
                        auditionMessage = if (event.playbackStarted) "Cue preview finished." else "Cue preview is unavailable on this device.",
                    )
                } else {
                    state
                }
            }
            is RigEvent.SelectTriggerFilter -> _state.update { state ->
                state.copy(
                    selectedTriggerFilter = event.filter,
                    auditioningId = null,
                    auditionMessage = "${event.filter.name.lowercase().replaceFirstChar(Char::uppercase)} filter selected.",
                )
            }
            RigEvent.RefreshDevices -> refreshStageDevices()
            RigEvent.ToggleDemoMode -> toggleDemoMode()
            RigEvent.AppBackgrounded -> {
                cancelArmTimeout()
                _state.update { state ->
                    state.copy(
                        liveSafeArmed = false,
                        patchPhase = disarmedPhase(state.patchPhase),
                        auditioningId = null,
                        patchMessage = if (state.liveSafeArmed) "Live Safe disarmed because the app left the foreground." else state.patchMessage,
                        auditionMessage = if (state.auditioningId != null) "Cue stopped because the app left the foreground." else state.auditionMessage,
                    )
                }
            }
        }
    }

    private fun refreshStageDevices() {
        if (_state.value.demoMode) return
        val devices = stageRepository.devices()
        _state.update { state ->
            state.copy(
                devices = devices,
                expectedDeviceCount = devices.size,
                liveSafeArmed = false,
                patchPhase = PatchPhase.STAGED,
                patchMessage = if (devices.isEmpty()) {
                    "No Android MIDI endpoint detected. Connect hardware or use the isolated demo."
                } else {
                    "${devices.size} endpoint(s) discovered. Open, identity, and loopback checks are still required."
                },
            )
        }
        cancelArmTimeout()
    }

    private fun toggleDemoMode() {
        cancelArmTimeout()
        val enteringDemo = !_state.value.demoMode
        activeRepository = if (enteringDemo) demoRepository else stageRepository
        val devices = activeRepository.devices()
        _state.value = RigUiState(
            devices = devices,
            expectedDeviceCount = devices.size,
            triggers = activeRepository.triggers(),
            artifacts = activeRepository.artifacts(),
            demoMode = enteringDemo,
            patchMessage = if (enteringDemo) {
                "Isolated demo loaded. No Android MIDI endpoint will be opened or written."
            } else if (devices.isEmpty()) {
                "Stage mode: no MIDI endpoint detected. Physical output remains fail-closed."
            } else {
                "Stage mode: ${devices.size} endpoint(s) discovered; validation remains open."
            },
        )
    }

    private fun commitPatch() {
        val current = _state.value
        val allReady = current.expectedDeviceCount > 0
            && current.devices.size == current.expectedDeviceCount
            && current.devices.all { it.status == DeviceStatus.READY }
        _state.update {
            if (canCommitPatch(it.liveSafeArmed, allReady)) {
                it.copy(
                    patchMessage = if (it.demoMode) {
                        "Committed isolated demo preview. Undo is available."
                    } else {
                        "Committed validated stage plan. Hardware write adapter is not connected in this build."
                    },
                    liveSafeArmed = false,
                    patchPhase = PatchPhase.COMMITTED,
                )
            } else {
                it.copy(patchMessage = "Commit blocked — arm Live Safe and resolve WATCH/OFFLINE devices.")
            }
        }
    }

    fun artifactReady(artifact: DownloadArtifact): Boolean = artifact.state == ArtifactState.READY

    private fun scheduleArmTimeout() {
        cancelArmTimeout()
        armTimeoutJob = viewModelScope.launch {
            delay(15_000)
            _state.update { state ->
                if (state.liveSafeArmed) {
                    state.copy(
                        liveSafeArmed = false,
                        patchPhase = PatchPhase.STAGED,
                        patchMessage = "Live Safe timed out after 15 seconds. Arm again to commit.",
                    )
                } else {
                    state
                }
            }
        }
    }

    private fun cancelArmTimeout() {
        armTimeoutJob?.cancel()
        armTimeoutJob = null
    }

    private fun disarmedPhase(phase: PatchPhase): PatchPhase = when (phase) {
        PatchPhase.ARMED -> PatchPhase.STAGED
        else -> phase
    }
}
