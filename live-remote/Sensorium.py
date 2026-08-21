# SENSORIUM Ableton 12 MIDI Remote Script
# Location: %USERPROFILE%\Documents\Ableton\User Library\MIDI Remote Scripts\Sensorium\Sensorium.py
#
# This script hooks into the Ableton Live 12 API and forwards important MIDI, 
# transport, clock and hardware telemetry via OSC/UDP to the Sensorium Tauri Bridge.

import live
import sys
import os
import socket
import json
import threading
import time

class SensoriumBridge(object):
    """
    Handles background connection and JSON-over-UDP streaming 
    from Ableton Live to the Sensorium local Rust daemon.
    """
    def __init__(self, parent, host="127.0.0.1", port=5125):
        self.parent = parent
        self.host = host
        self.port = port
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.active = True
        self.log("Sensorium UDP Client initialized targeting %s:%d" % (host, port))

    def log(self, msg):
        self.parent.log_message("[Sensorium Bridge] " + str(msg))

    def send_event(self, event_type, data):
        """Sends a JSON formatted packet to the Rust AXUM / OSC bridge."""
        payload = {
            "event": event_type,
            "timestamp": time.time(),
            "data": data
        }
        try:
            msg = json.dumps(payload).encode('utf-8')
            self.sock.sendto(msg, (self.host, self.port))
        except Exception as e:
            self.log("Error sending UDP: " + str(e))

    def shutdown(self):
        self.active = False
        self.sock.close()


class Sensorium(object):
    """
    Primary Control Surface remote script class.
    Listens to song events, clip statuses, track arm state, and device telemetry.
    """
    def __init__(self, c_instance):
        self.c_instance = c_instance
        self.bridge = SensoriumBridge(self)
        self.setup_listeners()
        self.bridge.send_event("handshake", {
            "status": "connected",
            "version": "1.0.0",
            "ableton_version": "12.0"
        })
        self.log_message("Sensorium Ableton 12 Remote Script fully loaded.")

    def log_message(self, message):
        """Appears in Ableton's Log.txt"""
        self.c_instance.log_message("[Sensorium] " + str(message))

    def setup_listeners(self):
        """Bind listeners to song transport and master track properties."""
        song = self.song()
        
        # Transport & Tempo
        if not song.tempo_has_listener(self._on_tempo_changed):
            song.add_tempo_listener(self._on_tempo_changed)
        if not song.is_playing_has_listener(self._on_is_playing_changed):
            song.add_is_playing_listener(self._on_is_playing_changed)
            
        # Tracks & Clips
        if not song.tracks_has_listener(self._on_tracks_changed):
            song.add_tracks_listener(self._on_tracks_changed)
            
        self._setup_track_listeners()
        self._send_full_sync()

    def song(self):
        return self.c_instance.song()

    def _setup_track_listeners(self):
        """Bind track arms and device updates."""
        for track in self.song().tracks:
            if track.can_be_armed:
                if not track.arm_has_listener(self._on_track_arm_changed):
                    track.add_arm_listener(self._on_track_arm_changed)
            
            # Listen to device list on tracks
            if not track.devices_has_listener(self._on_devices_changed):
                track.add_devices_listener(self._on_devices_changed)

    def _on_tempo_changed(self):
        bpm = self.song().tempo
        self.bridge.send_event("tempo", {"bpm": round(bpm, 2)})

    def _on_is_playing_changed(self):
        is_playing = self.song().is_playing
        self.bridge.send_event("transport", {
            "is_playing": is_playing,
            "beat": self.song().current_song_time
        })

    def _on_tracks_changed(self):
        self._setup_track_listeners()
        self._send_full_sync()

    def _on_track_arm_changed(self):
        armed_tracks = []
        for track in self.song().tracks:
            if track.can_be_armed and track.arm:
                armed_tracks.append(track.name)
        self.bridge.send_event("track_arm", {"armed_tracks": armed_tracks})

    def _on_devices_changed(self):
        devices = []
        for track in self.song().tracks:
            for device in track.devices:
                devices.append({
                    "track": track.name,
                    "device": device.name,
                    "type": "Visting"
                })
        self.bridge.send_event("devices", {"devices": devices})

    def _send_full_sync(self):
        """Send a full state update of Ableton's active elements."""
        song = self.song()
        armed_tracks = [t.name for t in song.tracks if t.can_be_armed and t.arm]
        
        # Get active device names in Master track and armed tracks
        active_devices = []
        for track in song.tracks:
            if track.arm or track == song.master_track:
                for device in track.devices:
                    active_devices.append(device.name)

        self.bridge.send_event("sync", {
            "bpm": round(song.tempo, 2),
            "is_playing": song.is_playing,
            "armed_tracks": armed_tracks,
            "active_devices": active_devices[:4], # Limit to avoid buffer bloat
            "beat": song.current_song_time
        })

    def disconnect(self):
        """Cleans up listeners and sockets on shut down."""
        song = self.song()
        if song.tempo_has_listener(self._on_tempo_changed):
            song.remove_tempo_listener(self._on_tempo_changed)
        if song.is_playing_has_listener(self._on_is_playing_changed):
            song.remove_is_playing_listener(self._on_is_playing_changed)
        if song.tracks_has_listener(self._on_tracks_changed):
            song.remove_tracks_listener(self._on_tracks_changed)
            
        self.bridge.send_event("handshake", {"status": "disconnected"})
        self.bridge.shutdown()
        self.log_message("Sensorium Remote Script cleanly disconnected.")
