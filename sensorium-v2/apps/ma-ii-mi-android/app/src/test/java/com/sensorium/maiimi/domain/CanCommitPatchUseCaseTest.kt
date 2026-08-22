package com.sensorium.maiimi.domain

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CanCommitPatchUseCaseTest {
    private val useCase = CanCommitPatchUseCase()

    @Test
    fun `commit needs both a local arm and a ready rig`() {
        assertFalse(useCase(isArmed = false, allDevicesReady = true))
        assertFalse(useCase(isArmed = true, allDevicesReady = false))
        assertTrue(useCase(isArmed = true, allDevicesReady = true))
    }
}
