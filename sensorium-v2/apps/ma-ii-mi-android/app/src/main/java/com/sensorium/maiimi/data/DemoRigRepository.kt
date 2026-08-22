package com.sensorium.maiimi.data

import com.sensorium.maiimi.domain.ArtifactState
import com.sensorium.maiimi.domain.Device
import com.sensorium.maiimi.domain.DeviceStatus
import com.sensorium.maiimi.domain.DownloadArtifact
import com.sensorium.maiimi.domain.RigRepository
import com.sensorium.maiimi.domain.SoundTrigger

class DemoRigRepository : RigRepository {
    override fun devices(): List<Device> = listOf(
        Device("S23 Ultra", "Spatial remote", DeviceStatus.READY, "FOH / hand"),
        Device("HX Stomp XL", "Guitar FX", DeviceStatus.READY, "Stage left"),
        Device("Digitakt II", "Clock + drums", DeviceStatus.READY, "Center"),
        Device("Apollo x8p", "Interface", DeviceStatus.READY, "Rack A"),
        Device("DMX bridge", "Lighting cue", DeviceStatus.WATCH, "Stage right"),
    )

    override fun triggers(): List<SoundTrigger> = listOf(
        SoundTrigger("night", "Night Drive Acapella", "Clearance: demo", "Am", "0:12"),
        SoundTrigger("pulse", "Pulse Stem — vocal air", "Stem / 48 kHz", "Dm", "0:08"),
        SoundTrigger("glass", "Glass Teeth MIDI phrase", "MIDI / CC-ready", "F#", "0:06"),
    )

    override fun artifacts(): List<DownloadArtifact> = listOf(
        DownloadArtifact("Android", "MA-II-MI-0.1.0-Android-debug.apk", ArtifactState.READY, "Debug-signed development build — install locally"),
        DownloadArtifact("Windows", "Sensorium-Setup.exe", ArtifactState.BUILDING, "Queued for signed release pipeline"),
        DownloadArtifact("macOS", "Sensorium.dmg", ArtifactState.MACOS_REQUIRED, "Requires macOS signing and notarization"),
        DownloadArtifact("iOS", "Sensorium.ipa", ArtifactState.APPLE_SIGNING_REQUIRED, "Requires Apple Developer signing / TestFlight"),
    )
}
