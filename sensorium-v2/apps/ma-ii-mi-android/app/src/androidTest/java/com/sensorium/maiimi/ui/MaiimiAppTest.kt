package com.sensorium.maiimi.ui

import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.sensorium.maiimi.data.DemoRigRepository
import com.sensorium.maiimi.domain.Workspace
import com.sensorium.maiimi.presentation.RigEvent
import com.sensorium.maiimi.presentation.RigUiState
import com.sensorium.maiimi.presentation.TriggerFilter
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class MaiimiAppTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun watchDeviceKeepsCommitDisabled() {
        val repository = DemoRigRepository()
        composeRule.setContent {
            MaiimiTheme {
                MaiimiApp(
                    state = RigUiState(
                        workspace = Workspace.PATCH,
                        devices = repository.devices(),
                        expectedDeviceCount = repository.devices().size,
                        liveSafeArmed = true,
                    ),
                    onEvent = {},
                    isArtifactReady = { false },
                )
            }
        }

        composeRule.onNodeWithText("Commit").assertIsNotEnabled()
    }

    @Test
    fun midiFilterEmitsARealSelectionEvent() {
        val repository = DemoRigRepository()
        var selected: TriggerFilter? = null
        composeRule.setContent {
            MaiimiTheme {
                MaiimiApp(
                    state = RigUiState(
                        workspace = Workspace.AUDITION,
                        devices = repository.devices(),
                        expectedDeviceCount = repository.devices().size,
                        triggers = repository.triggers(),
                    ),
                    onEvent = { event ->
                        if (event is RigEvent.SelectTriggerFilter) selected = event.filter
                    },
                    isArtifactReady = { false },
                )
            }
        }

        composeRule.onNodeWithText("MIDI").performClick()
        assertEquals(TriggerFilter.MIDI, selected)
    }
}
