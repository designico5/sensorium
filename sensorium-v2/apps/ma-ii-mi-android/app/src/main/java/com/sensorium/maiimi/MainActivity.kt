package com.sensorium.maiimi

import android.media.midi.MidiDeviceInfo
import android.media.midi.MidiManager
import android.os.Bundle
import android.os.Handler
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.ViewModelProvider
import com.sensorium.maiimi.data.AndroidMidiRigRepository
import com.sensorium.maiimi.presentation.RigEvent
import com.sensorium.maiimi.presentation.RigViewModel
import com.sensorium.maiimi.ui.MaiimiApp
import com.sensorium.maiimi.ui.MaiimiTheme

class MainActivity : ComponentActivity() {
    private val stageRepository by lazy { AndroidMidiRigRepository(applicationContext) }
    private val rigViewModel: RigViewModel by lazy {
        ViewModelProvider(
            this,
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
                    require(modelClass.isAssignableFrom(RigViewModel::class.java))
                    return RigViewModel(stageRepository) as T
                }
            },
        )[RigViewModel::class.java]
    }
    private val midiManager by lazy { getSystemService(MidiManager::class.java) }
    private var midiCallbackRegistered = false
    private val midiDeviceCallback = object : MidiManager.DeviceCallback() {
        override fun onDeviceAdded(device: MidiDeviceInfo) = refreshMidiInventory()
        override fun onDeviceRemoved(device: MidiDeviceInfo) = refreshMidiInventory()
        override fun onDeviceStatusChanged(status: android.media.midi.MidiDeviceStatus) = refreshMidiInventory()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MaiimiTheme {
                val state by rigViewModel.state.collectAsStateWithLifecycle()
                MaiimiApp(
                    state = state,
                    onEvent = rigViewModel::onEvent,
                    isArtifactReady = rigViewModel::artifactReady,
                )
            }
        }
    }

    override fun onStop() {
        if (midiCallbackRegistered) {
            midiManager?.unregisterDeviceCallback(midiDeviceCallback)
            midiCallbackRegistered = false
        }
        rigViewModel.onEvent(RigEvent.AppBackgrounded)
        super.onStop()
    }

    @Suppress("DEPRECATION")
    override fun onStart() {
        super.onStart()
        if (!midiCallbackRegistered && midiManager != null) {
            midiManager?.registerDeviceCallback(midiDeviceCallback, Handler(mainLooper))
            midiCallbackRegistered = true
        }
        refreshMidiInventory()
    }

    private fun refreshMidiInventory() {
        runOnUiThread { rigViewModel.onEvent(RigEvent.RefreshDevices) }
    }
}
