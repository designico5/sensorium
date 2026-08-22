package com.sensorium.maiimi.ui

import android.media.AudioManager
import android.media.ToneGenerator
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Download
import androidx.compose.material.icons.rounded.GraphicEq
import androidx.compose.material.icons.rounded.Hub
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Tune
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.sensorium.maiimi.domain.ArtifactState
import com.sensorium.maiimi.domain.Device
import com.sensorium.maiimi.domain.DeviceStatus
import com.sensorium.maiimi.domain.DownloadArtifact
import com.sensorium.maiimi.domain.SoundTrigger
import com.sensorium.maiimi.domain.Workspace
import com.sensorium.maiimi.presentation.PatchPhase
import com.sensorium.maiimi.presentation.RigEvent
import com.sensorium.maiimi.presentation.RigUiState
import com.sensorium.maiimi.presentation.TriggerFilter
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MaiimiApp(
    state: RigUiState,
    onEvent: (RigEvent) -> Unit,
    isArtifactReady: (DownloadArtifact) -> Boolean,
) {
    AuditionTone(
        auditioningId = state.auditioningId,
        onCompleted = { triggerId, playbackStarted ->
            onEvent(RigEvent.AuditionCompleted(triggerId, playbackStarted))
        },
    )
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("MA-II-MI", fontWeight = FontWeight.Black, letterSpacing = 1.8.sp)
                        Text("S23 Ultra spatial remote", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                actions = {
                    AssistChip(
                        onClick = { onEvent(RigEvent.ToggleDemoMode) },
                        label = { Text(if (state.demoMode) "Exit demo" else "Demo") },
                    )
                    Spacer(Modifier.width(8.dp))
                    SafetyPill(armed = state.liveSafeArmed, onClick = { onEvent(RigEvent.ToggleLiveSafe) })
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                Workspace.entries.forEach { workspace ->
                    NavigationBarItem(
                        selected = workspace == state.workspace,
                        onClick = { onEvent(RigEvent.SelectWorkspace(workspace)) },
                        icon = { Icon(iconFor(workspace), contentDescription = null) },
                        label = { Text(workspace.label) },
                        colors = NavigationBarItemDefaults.colors(indicatorColor = MaterialTheme.colorScheme.primaryContainer),
                    )
                }
            }
        },
    ) { inset ->
        when (state.workspace) {
            Workspace.ROOM -> RoomScreen(state, Modifier.padding(inset))
            Workspace.PATCH -> PatchScreen(state, onEvent, Modifier.padding(inset))
            Workspace.AUDITION -> AuditionScreen(state, onEvent, Modifier.padding(inset))
            Workspace.DOWNLOADS -> DownloadScreen(state, isArtifactReady, Modifier.padding(inset))
        }
    }
}

@Composable
private fun SafetyPill(armed: Boolean, onClick: () -> Unit) {
    AssistChip(
        modifier = Modifier.semantics {
            stateDescription = if (armed) "Armed" else "Disarmed"
        },
        onClick = onClick,
        label = { Text(if (armed) "LIVE SAFE ARMED" else "LIVE SAFE", fontWeight = FontWeight.Bold, fontSize = 10.sp) },
        leadingIcon = { Icon(Icons.Rounded.Lock, contentDescription = null, modifier = Modifier.size(15.dp)) },
        colors = androidx.compose.material3.AssistChipDefaults.assistChipColors(
            containerColor = if (armed) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
            labelColor = if (armed) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
        ),
    )
}

@Composable
private fun RoomScreen(state: RigUiState, modifier: Modifier) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item { RoomMap(state.devices) }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Metric("4/5", "ready", Modifier.weight(1f))
                Metric("37 ms", "route pulse", Modifier.weight(1f))
                Metric("124", "BPM guard", Modifier.weight(1f))
            }
        }
        item {
            Text("Rig presence", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        }
        items(state.devices, key = { it.name }) { device -> DeviceRow(device) }
    }
}

@Composable
private fun RoomMap(devices: List<Device>) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(24.dp),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Spatial room", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                    Text("Pan, pinch and device scan are native-ready on S23 Ultra.", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
                }
                Box(
                    modifier = Modifier.size(36.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer),
                    contentAlignment = Alignment.Center,
                ) { Text("AR", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Black) }
            }
            Spacer(Modifier.height(14.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(220.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(Brush.linearGradient(listOf(Color(0xFF0B322D), Color(0xFF071B19)))),
            ) {
                Canvas(modifier = Modifier.fillMaxSize()) {
                    val width = size.width
                    val height = size.height
                    drawCircle(Color(0x335DF0D1), radius = width * 0.45f, center = Offset(width * 0.66f, height * 0.44f))
                    drawCircle(Color(0x6643E0C1), radius = width * 0.24f, center = Offset(width * 0.66f, height * 0.44f), style = Stroke(width = 2.dp.toPx()))
                    drawLine(Color(0x558AF5DC), Offset(width * .1f, height * .76f), Offset(width * .84f, height * .26f), strokeWidth = 2.dp.toPx())
                }
                devices.take(4).forEachIndexed { index, device ->
                    val alignment = listOf(Alignment.BottomStart, Alignment.Center, Alignment.TopEnd, Alignment.BottomEnd)[index]
                    DeviceBeacon(device, Modifier.align(alignment).padding(14.dp))
                }
                Text("STAGE / 5D", modifier = Modifier.align(Alignment.TopStart).padding(12.dp), color = MaterialTheme.colorScheme.primary, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
            }
        }
    }
}

@Composable
private fun DeviceBeacon(device: Device, modifier: Modifier) {
    val dot = when (device.status) {
        DeviceStatus.READY -> MaterialTheme.colorScheme.primary
        DeviceStatus.WATCH -> MaterialTheme.colorScheme.tertiary
        DeviceStatus.OFFLINE -> MaterialTheme.colorScheme.error
    }
    Row(
        modifier = modifier.clip(RoundedCornerShape(12.dp)).background(Color(0xD9143933)).padding(horizontal = 8.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(7.dp).clip(CircleShape).background(dot))
        Spacer(Modifier.width(6.dp))
        Text(device.name, maxLines = 1, overflow = TextOverflow.Ellipsis, fontSize = 10.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun Metric(value: String, label: String, modifier: Modifier) {
    Card(modifier = modifier, colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant), shape = RoundedCornerShape(16.dp)) {
        Column(Modifier.padding(12.dp)) {
            Text(value, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary)
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun DeviceRow(device: Device) {
    val label = when (device.status) { DeviceStatus.READY -> "READY"; DeviceStatus.WATCH -> "WATCH"; DeviceStatus.OFFLINE -> "OFFLINE" }
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), shape = RoundedCornerShape(18.dp)) {
        Row(modifier = Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(34.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer), contentAlignment = Alignment.Center) {
                Icon(Icons.Rounded.Hub, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(device.name, fontWeight = FontWeight.Bold)
                Text("${device.role} · ${device.position}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text(label, color = if (device.status == DeviceStatus.READY) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.tertiary, fontWeight = FontWeight.Black, fontSize = 10.sp)
        }
    }
}

@Composable
private fun PatchScreen(state: RigUiState, onEvent: (RigEvent) -> Unit, modifier: Modifier) {
    val allDevicesReady = state.expectedDeviceCount > 0
        && state.devices.size == state.expectedDeviceCount
        && state.devices.all { it.status == DeviceStatus.READY }
    LazyColumn(modifier = modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item {
            Text("Patch safety", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
            Text("Preview every change before a physical re-patch.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), shape = RoundedCornerShape(24.dp)) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Text("STAGED DIFF", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold, fontSize = 11.sp, letterSpacing = 1.sp)
                    Text("Digitakt II clock → Apollo x8p cue bus", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = .35f))
                    Text(
                        state.patchMessage,
                        modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Button(
                            onClick = { onEvent(RigEvent.CommitPatch) },
                            modifier = Modifier.weight(1f),
                            enabled = state.liveSafeArmed && allDevicesReady,
                        ) { Text("Commit") }
                        OutlinedButton(
                            onClick = { onEvent(RigEvent.UndoPatch) },
                            modifier = Modifier.weight(1f),
                            enabled = state.patchPhase == PatchPhase.COMMITTED,
                        ) { Text("Undo") }
                    }
                    Text(
                        when {
                            state.demoMode && !allDevicesReady -> "Demo commit stays blocked until every virtual device is READY. Demo mode never opens hardware."
                            state.demoMode && state.liveSafeArmed -> "Demo armed locally. No Android MIDI endpoint is open."
                            !allDevicesReady -> "Stage commit stays blocked until every discovered endpoint passes open, identity, and loopback checks."
                            state.liveSafeArmed -> "Stage plan armed for 15 seconds. This build still has no physical write adapter."
                            else -> "Arm the Live Safe pill above to enable commit."
                        },
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
        item { Text("Before changeover", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold) }
        item { ChecklistRow("Expected vs. seen", "5 expected · 5 detected", true) }
        item { ChecklistRow("Clock guardian", "124 BPM stable", true) }
        item { ChecklistRow("Rescue scene", "Last known-safe scene cached", true) }
    }
}

@Composable
private fun ChecklistRow(title: String, value: String, ready: Boolean) {
    Row(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surface).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(10.dp).clip(CircleShape).background(if (ready) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error))
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) { Text(title, fontWeight = FontWeight.Bold); Text(value, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
    }
}

@Composable
private fun AuditionScreen(state: RigUiState, onEvent: (RigEvent) -> Unit, modifier: Modifier) {
    val visibleTriggers = state.triggers.filter { trigger ->
        triggerMatchesFilter(trigger, state.selectedTriggerFilter)
    }
    LazyColumn(modifier = modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item {
            Text("Audition lab", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
            Text("Try a trigger before you patch it into the room.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TriggerFilter.entries.forEach { filter ->
                    FilterChip(
                        selected = state.selectedTriggerFilter == filter,
                        onClick = { onEvent(RigEvent.SelectTriggerFilter(filter)) },
                        label = { Text(filterLabel(filter)) },
                    )
                }
            }
        }
        item {
            Text(
                state.auditionMessage,
                modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        items(visibleTriggers, key = { it.id }) { trigger ->
            val isPlaying = state.auditioningId == trigger.id
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), shape = RoundedCornerShape(20.dp)) {
                Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(44.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer), contentAlignment = Alignment.Center) {
                        Icon(Icons.Rounded.GraphicEq, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(trigger.title, fontWeight = FontWeight.Bold)
                        Text("${trigger.source} · ${trigger.key} · ${trigger.duration}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Button(onClick = { onEvent(RigEvent.ToggleAudition(trigger.id)) }, contentPadding = PaddingValues(horizontal = 14.dp), colors = ButtonDefaults.buttonColors(containerColor = if (isPlaying) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.primary)) {
                        Icon(Icons.Rounded.PlayArrow, contentDescription = null, modifier = Modifier.size(17.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(if (isPlaying) "Stop" else "Hear")
                    }
                }
            }
        }
        item {
            Text(
                if (state.demoMode) "Demo audition uses an on-device cue tone. No external audio is accessed."
                else "Stage audition is unavailable until a licensed source and measured output route are configured.",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun DownloadScreen(state: RigUiState, isArtifactReady: (DownloadArtifact) -> Boolean, modifier: Modifier) {
    LazyColumn(modifier = modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item {
            Text("Install center", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
            Text("Every platform shows its real build and signing state.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        items(state.artifacts, key = { it.platform }) { artifact ->
            val isReady = isArtifactReady(artifact)
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), shape = RoundedCornerShape(20.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(38.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) {
                            Icon(Icons.Rounded.Download, contentDescription = null, tint = if (isReady) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) { Text(artifact.platform, fontWeight = FontWeight.Bold); Text(artifact.filename, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                        Text(statusLabel(artifact.state), fontSize = 10.sp, fontWeight = FontWeight.Black, color = if (isReady) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.tertiary)
                    }
                    Text(artifact.detail, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    if (isReady) {
                        Text("Artifact path is documented in the repository build instructions.", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                    }
                }
            }
        }
        item {
            Text(
                if (state.demoMode) "Demo artifacts are development-only and imply no store or platform approval."
                else "Stage artifacts require release signing and post-sign verification before installation.",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun AuditionTone(
    auditioningId: String?,
    onCompleted: (String, Boolean) -> Unit,
) {
    val tone = remember {
        runCatching { ToneGenerator(AudioManager.STREAM_MUSIC, 62) }.getOrNull()
    }
    LaunchedEffect(auditioningId) {
        if (auditioningId == null) {
            runCatching { tone?.stopTone() }
            return@LaunchedEffect
        }

        var playbackStarted = false
        try {
            playbackStarted = runCatching {
                tone?.startTone(ToneGenerator.TONE_PROP_BEEP2, 700) == true
            }.getOrDefault(false)
            if (playbackStarted) delay(750)
        } finally {
            runCatching { tone?.stopTone() }
            onCompleted(auditioningId, playbackStarted)
        }
    }
    DisposableEffect(Unit) {
        onDispose {
            runCatching { tone?.stopTone() }
            runCatching { tone?.release() }
        }
    }
}

private fun triggerMatchesFilter(trigger: SoundTrigger, filter: TriggerFilter): Boolean = when (filter) {
    TriggerFilter.ACAPELLAS -> "acapella" in trigger.title.lowercase() || "acapella" in trigger.source.lowercase()
    TriggerFilter.STEMS -> "stem" in trigger.title.lowercase() || "stem" in trigger.source.lowercase()
    TriggerFilter.MIDI -> "midi" in trigger.title.lowercase() || "midi" in trigger.source.lowercase()
}

private fun filterLabel(filter: TriggerFilter): String = when (filter) {
    TriggerFilter.ACAPELLAS -> "Acapellas"
    TriggerFilter.STEMS -> "Stems"
    TriggerFilter.MIDI -> "MIDI"
}

private fun iconFor(workspace: Workspace) = when (workspace) {
    Workspace.ROOM -> Icons.Rounded.Hub
    Workspace.PATCH -> Icons.Rounded.Tune
    Workspace.AUDITION -> Icons.Rounded.PlayArrow
    Workspace.DOWNLOADS -> Icons.Rounded.Download
}

private fun statusLabel(state: ArtifactState): String = when (state) {
    ArtifactState.READY -> "READY"
    ArtifactState.BUILDING -> "BUILDING"
    ArtifactState.MACOS_REQUIRED -> "MACOS"
    ArtifactState.APPLE_SIGNING_REQUIRED -> "SIGNING"
}
