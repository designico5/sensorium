package com.sensorium.maiimi.domain

enum class Workspace(val label: String) {
    ROOM("Room"), PATCH("Patch"), AUDITION("Audition"), DOWNLOADS("Downloads")
}

data class Device(
    val name: String,
    val role: String,
    val status: DeviceStatus,
    val position: String,
    val id: String = name,
    val physicallyDiscovered: Boolean = false,
    val inputPortCount: Int = 0,
    val outputPortCount: Int = 0,
)

enum class DeviceStatus { READY, WATCH, OFFLINE }

data class SoundTrigger(
    val id: String,
    val title: String,
    val source: String,
    val key: String,
    val duration: String,
)

data class DownloadArtifact(
    val platform: String,
    val filename: String,
    val state: ArtifactState,
    val detail: String,
)

enum class ArtifactState { READY, BUILDING, MACOS_REQUIRED, APPLE_SIGNING_REQUIRED }

interface RigRepository {
    fun devices(): List<Device>
    fun triggers(): List<SoundTrigger>
    fun artifacts(): List<DownloadArtifact>
}
