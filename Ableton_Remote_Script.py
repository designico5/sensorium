# Ableton Live 12 Remote Handshake Script
# Designed for Windows 11 ASIO Clock Synchronization

import Live
from _Framework.ControlSurface import ControlSurface
import socket
import threading
import sys

# Default local OSC UDP bridge configuration
HOST = '127.0.0.1'
PORT_OUT = 5125 # Sensorium diagnostics listener
PORT_IN = 5126

class Ableton_Remote_Script(ControlSurface):
    def __init__(self, c_instance):
        super(Ableton_Remote_Script, self).__init__(c_instance)
        self.show_message("Sensorium Win11 Clock Bridge Loaded Successfully")
        
        # Setup background thread for OSC polling
        self._running = True
        self._sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self._sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        
        self._thread = threading.Thread(target=self._listen_for_clock)
        self._thread.daemon = True
        self._thread.start()
        
        # Hook into Ableton song transport clock changes
        self.song().add_tempo_listener(self._on_tempo_changed)
        self.song().add_is_playing_listener(self._on_playback_state_changed)
        
    def _listen_for_clock(self):
        """ Listens for incoming trigger updates from the Sensorium diagnostics engine """
        try:
            self._sock.bind((HOST, PORT_IN))
            self._sock.settimeout(1.0)
            while self._running:
                try:
                    data, addr = self._sock.recvfrom(1024)
                    if b"PING" in data:
                        # Echo back handshake acknowledgement
                        self._sock.sendto(b"ACK_CLOCK", (HOST, PORT_OUT))
                except socket.timeout:
                    continue
        except Exception as e:
            self.log_message("Sensorium Bridge Connection Error: " + str(e))

    def _on_tempo_changed(self):
        """ Fired when BPM is changed inside Ableton Live """
        new_tempo = self.song().tempo
        self.show_message("Sensorium Sync: BPM changed to %.2f" % new_tempo)
        try:
            # Broadcast state to the local OSC UDP listener
            msg = ("BPM:%.2f" % new_tempo).encode('utf-8')
            self._sock.sendto(msg, (HOST, PORT_OUT))
        except:
            pass

    def _on_playback_state_changed(self):
        """ Broadcasts play/pause changes """
        is_playing = self.song().is_playing
        state_str = "PLAYING" if is_playing else "STOPPED"
        try:
            msg = ("STATE:%s" % state_str).encode('utf-8')
            self._sock.sendto(msg, (HOST, PORT_OUT))
        except:
            pass

    def disconnect(self):
        """ Cleanup hooks """
        self._running = False
        self.song().remove_tempo_listener(self._on_tempo_changed)
        self.song().remove_is_playing_listener(self._on_playback_state_changed)
        self._sock.close()
        super(Ableton_Remote_Script, self).disconnect()
