package com.sensorium.maiimi.presentation

import com.sensorium.maiimi.domain.Device
import com.sensorium.maiimi.domain.DeviceStatus
import com.sensorium.maiimi.domain.DownloadArtifact
import com.sensorium.maiimi.domain.RigRepository
import com.sensorium.maiimi.domain.SoundTrigger
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.rules.TestWatcher
import org.junit.runner.Description
import org.junit.Test
import org.junit.Rule

@OptIn(ExperimentalCoroutinesApi::class)
class RigViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `watch device blocks an armed patch commit`() {
        val viewModel = RigViewModel()

        viewModel.onEvent(RigEvent.ToggleLiveSafe)
        viewModel.onEvent(RigEvent.CommitPatch)

        assertTrue(viewModel.state.value.liveSafeArmed)
        assertTrue(viewModel.state.value.patchMessage.startsWith("Commit blocked"))
        assertFalse(viewModel.state.value.patchMessage.startsWith("Committed"))
        viewModel.onEvent(RigEvent.AppBackgrounded)
    }

    @Test
    fun `completed audition clears only the matching trigger`() {
        val viewModel = RigViewModel()

        viewModel.onEvent(RigEvent.ToggleAudition("night"))
        viewModel.onEvent(RigEvent.AuditionCompleted("pulse", playbackStarted = true))
        assertEquals("night", viewModel.state.value.auditioningId)

        viewModel.onEvent(RigEvent.AuditionCompleted("night", playbackStarted = true))
        assertNull(viewModel.state.value.auditioningId)
        assertEquals("night", viewModel.state.value.selectedTriggerId)
    }

    @Test
    fun `second tap stops the active audition immediately`() {
        val viewModel = RigViewModel()

        viewModel.onEvent(RigEvent.ToggleAudition("glass"))
        viewModel.onEvent(RigEvent.ToggleAudition("glass"))

        assertNull(viewModel.state.value.auditioningId)
        assertEquals("glass", viewModel.state.value.selectedTriggerId)
    }

    @Test
    fun `undo is unavailable before a commit and disarms live safe`() {
        val viewModel = RigViewModel()

        viewModel.onEvent(RigEvent.ToggleLiveSafe)
        viewModel.onEvent(RigEvent.UndoPatch)

        assertFalse(viewModel.state.value.liveSafeArmed)
        assertEquals(PatchPhase.STAGED, viewModel.state.value.patchPhase)
        assertTrue(viewModel.state.value.patchMessage.startsWith("Undo unavailable"))
    }

    @Test
    fun `backgrounding clears transient safety and audio state`() {
        val viewModel = RigViewModel()

        viewModel.onEvent(RigEvent.ToggleLiveSafe)
        viewModel.onEvent(RigEvent.ToggleAudition("pulse"))
        viewModel.onEvent(RigEvent.AppBackgrounded)

        assertFalse(viewModel.state.value.liveSafeArmed)
        assertEquals(PatchPhase.STAGED, viewModel.state.value.patchPhase)
        assertNull(viewModel.state.value.auditioningId)
    }

    @Test
    fun `filter selection is stateful and stops an active cue`() {
        val viewModel = RigViewModel()

        viewModel.onEvent(RigEvent.ToggleAudition("night"))
        viewModel.onEvent(RigEvent.SelectTriggerFilter(TriggerFilter.MIDI))

        assertEquals(TriggerFilter.MIDI, viewModel.state.value.selectedTriggerFilter)
        assertNull(viewModel.state.value.auditioningId)
    }

    @Test
    fun `all-ready rig commits and undo restores the safe preview phase`() {
        val viewModel = RigViewModel(readyRepository())

        viewModel.onEvent(RigEvent.ToggleLiveSafe)
        viewModel.onEvent(RigEvent.CommitPatch)
        assertEquals(PatchPhase.COMMITTED, viewModel.state.value.patchPhase)
        assertFalse(viewModel.state.value.liveSafeArmed)

        viewModel.onEvent(RigEvent.UndoPatch)
        assertEquals(PatchPhase.REVERTED, viewModel.state.value.patchPhase)
        assertTrue(viewModel.state.value.patchMessage.startsWith("Reverted"))
    }

    @Test
    fun `live safe automatically disarms after fifteen seconds`() = runTest(mainDispatcherRule.testDispatcher) {
        val viewModel = RigViewModel(readyRepository())

        viewModel.onEvent(RigEvent.ToggleLiveSafe)
        assertTrue(viewModel.state.value.liveSafeArmed)

        advanceTimeBy(15_001)

        assertFalse(viewModel.state.value.liveSafeArmed)
        assertEquals(PatchPhase.STAGED, viewModel.state.value.patchPhase)
        assertTrue(viewModel.state.value.patchMessage.startsWith("Live Safe timed out"))
    }

    @Test
    fun `rejected commit keeps the safety timeout active`() = runTest(mainDispatcherRule.testDispatcher) {
        val viewModel = RigViewModel()

        viewModel.onEvent(RigEvent.ToggleLiveSafe)
        viewModel.onEvent(RigEvent.CommitPatch)
        assertTrue(viewModel.state.value.liveSafeArmed)
        assertTrue(viewModel.state.value.patchMessage.startsWith("Commit blocked"))

        advanceTimeBy(15_001)

        assertFalse(viewModel.state.value.liveSafeArmed)
        assertEquals(PatchPhase.STAGED, viewModel.state.value.patchPhase)
        assertTrue(viewModel.state.value.patchMessage.startsWith("Live Safe timed out"))
    }

    @Test
    fun `stage starts empty and demo inventory is loaded only by the demo toggle`() {
        val viewModel = RigViewModel()

        assertFalse(viewModel.state.value.demoMode)
        assertTrue(viewModel.state.value.devices.isEmpty())

        viewModel.onEvent(RigEvent.ToggleDemoMode)
        assertTrue(viewModel.state.value.demoMode)
        assertTrue(viewModel.state.value.devices.isNotEmpty())
        assertTrue(viewModel.state.value.devices.none(Device::physicallyDiscovered))

        viewModel.onEvent(RigEvent.ToggleDemoMode)
        assertFalse(viewModel.state.value.demoMode)
        assertTrue(viewModel.state.value.devices.isEmpty())
    }

    @Test
    fun `stage inventory has no application-level device count ceiling`() {
        val endpointCount = 10_000
        val viewModel = RigViewModel(repositoryWithDevices(endpointCount, DeviceStatus.WATCH))

        assertEquals(endpointCount, viewModel.state.value.devices.size)
        assertEquals(endpointCount, viewModel.state.value.expectedDeviceCount)
        assertTrue(viewModel.state.value.devices.all(Device::physicallyDiscovered))
    }

    private fun readyRepository(): RigRepository = object : RigRepository {
        override fun devices(): List<Device> = (1..5).map { index ->
            Device("Device $index", "Test", DeviceStatus.READY, "Position $index")
        }

        override fun triggers(): List<SoundTrigger> = emptyList()

        override fun artifacts(): List<DownloadArtifact> = emptyList()
    }

    private fun repositoryWithDevices(count: Int, status: DeviceStatus): RigRepository = object : RigRepository {
        override fun devices(): List<Device> = (1..count).map { index ->
            Device(
                name = "Endpoint $index",
                role = "Android MIDI",
                status = status,
                position = "Discovered",
                id = "endpoint-$index",
                physicallyDiscovered = true,
            )
        }

        override fun triggers(): List<SoundTrigger> = emptyList()
        override fun artifacts(): List<DownloadArtifact> = emptyList()
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class MainDispatcherRule(
    val testDispatcher: TestDispatcher = StandardTestDispatcher(),
) : TestWatcher() {
    override fun starting(description: Description) {
        Dispatchers.setMain(testDispatcher)
    }

    override fun finished(description: Description) {
        Dispatchers.resetMain()
    }
}
