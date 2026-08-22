package com.sensorium.maiimi.domain

class ObserveRigUseCase(private val repository: RigRepository) {
    operator fun invoke(): List<Device> = repository.devices()
}

class ObserveTriggersUseCase(private val repository: RigRepository) {
    operator fun invoke(): List<SoundTrigger> = repository.triggers()
}

class ObserveArtifactsUseCase(private val repository: RigRepository) {
    operator fun invoke(): List<DownloadArtifact> = repository.artifacts()
}

class CanCommitPatchUseCase {
    operator fun invoke(isArmed: Boolean, allDevicesReady: Boolean): Boolean =
        isArmed && allDevicesReady
}
