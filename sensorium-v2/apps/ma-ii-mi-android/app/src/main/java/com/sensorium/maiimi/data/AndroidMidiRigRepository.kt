package com.sensorium.maiimi.data

import android.content.Context
import android.content.pm.PackageManager
import android.media.midi.MidiDeviceInfo
import android.media.midi.MidiManager
import android.os.Build
import com.sensorium.maiimi.domain.Device
import com.sensorium.maiimi.domain.DeviceStatus
import com.sensorium.maiimi.domain.DownloadArtifact
import com.sensorium.maiimi.domain.RigRepository
import com.sensorium.maiimi.domain.SoundTrigger

class AndroidMidiRigRepository(context: Context) : RigRepository {
    private val appContext = context.applicationContext
    private val midiManager = appContext.getSystemService(MidiManager::class.java)

    override fun devices(): List<Device> {
        if (!appContext.packageManager.hasSystemFeature(PackageManager.FEATURE_MIDI)) return emptyList()
        val manager = midiManager ?: return emptyList()
        return connectedDevices(manager)
            .distinctBy(MidiDeviceInfo::getId)
            .map(::toDomainDevice)
            .sortedWith(compareBy(Device::name, Device::id))
    }

    override fun triggers(): List<SoundTrigger> = emptyList()

    override fun artifacts(): List<DownloadArtifact> = emptyList()

    @Suppress("DEPRECATION")
    private fun connectedDevices(manager: MidiManager): List<MidiDeviceInfo> =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            buildList {
                addAll(manager.getDevicesForTransport(MidiManager.TRANSPORT_MIDI_BYTE_STREAM))
                addAll(manager.getDevicesForTransport(MidiManager.TRANSPORT_UNIVERSAL_MIDI_PACKETS))
            }
        } else {
            manager.devices.toList()
        }

    private fun toDomainDevice(info: MidiDeviceInfo): Device {
        val properties = info.properties
        val name = properties.getString(MidiDeviceInfo.PROPERTY_NAME)
            ?: properties.getString(MidiDeviceInfo.PROPERTY_PRODUCT)
            ?: "MIDI endpoint ${info.id}"
        val manufacturer = properties.getString(MidiDeviceInfo.PROPERTY_MANUFACTURER)
            ?.takeIf(String::isNotBlank)
        val inputPorts = info.ports.count { it.type == MidiDeviceInfo.PortInfo.TYPE_INPUT }
        val outputPorts = info.ports.count { it.type == MidiDeviceInfo.PortInfo.TYPE_OUTPUT }
        val transport = when (info.type) {
            MidiDeviceInfo.TYPE_USB -> "USB"
            MidiDeviceInfo.TYPE_BLUETOOTH -> "Bluetooth MIDI"
            MidiDeviceInfo.TYPE_VIRTUAL -> "Virtual MIDI"
            else -> "Android MIDI"
        }

        return Device(
            id = "android-midi-${info.id}",
            name = listOfNotNull(manufacturer, name).joinToString(" "),
            role = "$transport • $inputPorts in / $outputPorts out",
            status = DeviceStatus.WATCH,
            position = "Discovered — endpoint open and loopback test pending",
            physicallyDiscovered = info.type != MidiDeviceInfo.TYPE_VIRTUAL,
            inputPortCount = inputPorts,
            outputPortCount = outputPorts,
        )
    }
}

class EmptyStageRigRepository : RigRepository {
    override fun devices(): List<Device> = emptyList()
    override fun triggers(): List<SoundTrigger> = emptyList()
    override fun artifacts(): List<DownloadArtifact> = emptyList()
}
