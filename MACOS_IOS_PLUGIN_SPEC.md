# SENSORIUM • MACOS, IOS & NATIVE PLUGIN ARCHITEKTUR-SPEZIFIKATION
> **Sicherheits- & Implementierungs-Dokumentation für proprietäre System-Sperren**  
> *Spezifikation für die ausfallsichere Ausrollung als internes, hardware-gebundenes Audio-Plugin (AUv3 / VST3) und Standalone-App unter macOS und iOS.*

---

## 🔒 1. DIE NULL-DUPLIZIERUNGS-PHILOSOPHIE (ZERO-DUPLICATION ENGINE)

Um zu garantieren, dass Sensorium nach der ersten Einrichtung auf einem System **unter keinen Umständen kopiert, dupliziert oder auf anderen Rechnern/Geräten lizenziert** werden kann, nutzt die native MacOS- und iOS-Variante eine tiefe Koppelung an die physische Prozessor-Architektur von Apple.

### 1.1 Kryptografische Verankerung im Apple Secure Enclave
Anstatt klassische Lizenzdateien oder Registry-Einträge zu nutzen, die kopiert werden können, erzeugt Sensorium beim ersten Start ein asymmetrisches Schlüsselpaar direkt im **Secure Enclave (Koprozessor für Hardware-Sicherheit)** des Apple-Silicon-Chips (M1/M2/M3/M4 bzw. A-Serie bei iOS):

1. **Hardware-Bound Key Generation:**  
   Die App generiert einen privaten 256-Bit-Elliptic-Curve-Schlüssel (secp256r1) direkt im Secure Enclave mit dem Attribut `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`.
   * **Der Clou:** Dieser Schlüssel verlässt das physische Silizium des Secure Enclave **niemals**. Er kann weder durch Root-Rechte, Dateisystem-Backups noch per RAM-Dumps ausgelesen werden.
2. **Die physische UID-Koppelung (Apple Silicon UIDs):**  
   Die Signatur zur Lizenzverifizierung wird mit der gerätespezifischen Unique ID (UID) des M-Chips verschlüsselt. Da die UID auf Hardwareebene in die Fuses des Prozessors eingebrannt ist, schlägt jede Entschlüsselung auf einem anderen, baugleichen Mac oder iPad fehl.

### 1.2 Schutz vor Klonen & Backups (Anti-Cloning-Mechanismus)
* **Keine Übertragung via Time Machine oder iCloud-Backup:**  
  Bei der Wiederherstellung eines Systems auf neuer Hardware schlägt der Zugriff auf den Keychain-Eintrag fehl, da das Flag `ThisDeviceOnly` die Migration physisch unterbindet.
* **App-Integritätsschutz (App Attest):**  
  Unter iOS und macOS wird das Apple `DeviceCheck` / `App Attest`-Framework aufgerufen. Es prüft kryptografisch gegenüber den Apple-Servern, ob die App-Binärdatei manipuliert wurde oder in einer emulierten/virtuellen Sandbox läuft.

---

## ⚙️ 2. NATIVE IMPLEMENTIERUNG (OS-SPEZIFISCH)

### 2.1 macOS (Native App & VST3/AUv3-Plugin)
Auf dem Mac läuft Sensorium als hocheffizienter Hintergrund-Daemon oder als direktes DAW-Plugin.

* **Audio-Engine:** Geschrieben in nativem C++20 unter Nutzung von **CoreAudio** für extrem geringe Puffer-Rundlaufzeiten (< 1.5ms bei 96kHz).
* **Metal-beschleunigtes GUI:** Die spektakuläre D3-Physik-Engine wird für Mac-Bildschirme direkt in Metal übersetzt, um die GPU-Last der DAW bei Live-Auftritten gegen 0% zu drücken.
* **Verhinderung von Jitter:** Direkter Zugriff auf macOS `Thread-Priority` APIs (`THREAD_TIME_CONSTRAINT_POLICY`), um dem Sensorium-Taktgenerator unbedingten CPU-Vorrang vor anderen macOS-Hintergrundprozessen zu geben.

### 2.2 iOS (iPadOS / Standalone & AUv3-Plugin)
Das iPad ist das ideale "Zweit-Schild" im Live-Set-Setup. Sensorium klinkt sich als **AUv3-Plugin** in mobile DAWs wie *AUM*, *Cubasis* oder *Logic Pro für iPad* ein.

* **Inter-App Audio & MIDI:** Sensorium routet MIDI-Signale über das physische USB-C-Interface direkt an angeschlossene USB-MIDI-Hubs.
* **Touch-Optimierung:** Die niven iOS-Gesten triggern hochpräzise Parameter-Nudges (z.B. den Slip Nudge Slider per Multi-Touch haptisch fühlbar über die Apple Taptic Engine).

---

## 🧩 3. DAS INTERNE PLUGIN-MANDAT (HOST INTEGRATION SPEC)

Wenn Sensorium als internes Utility-Plugin (z.B. AUv3 oder VST3) geladen wird, greift die **Host-Sandboxing-Regel**.

### Schnittstellen-Matrix für den Bühneneinsatz:

```
[ Physische MIDI-Hardware ] ──(USB/DIN)──> [ SENSORIUM PLUGIN ]
                                                   │ (Kryptografische Hardware-Sperre)
                                                   ├──> Safe-Mode (PLL-Ausrichtung)
                                                   └──> MIDI-Clock Sync (Jitter-Filter)
                                                   │
[ DAW Host (Ableton / AUM) ] <────(AUv3/VST3)──────┘
```

1. **Zero-Copy Memory Architecture:**  
   Die Audio-Puffer des DAW-Hosts werden per Direct Memory Access (DMA) gelesen. Das Plugin erzeugt keinerlei unnötige RAM-Kopien, wodurch die Speicherbandbreite für Synthesizer-Plugins unangetastet bleibt.
2. **Die "Host-Lock" Barriere:**  
   Das Plugin verifiziert im Millisekundentakt, ob die ID des Host-Prozesses (PID) mit der lizenzierten Host-Konfiguration übereinstimmt. Wird das Plugin-Bundle manuell aus dem Plugin-Verzeichnis kopiert und auf einem anderen Rechner abgelegt, startet es im **Stumm-Modus (Dormant State)** und verweigert jegliche Signalverarbeitung, da der asymmetrische Handshake mit dem lokalen Secure Enclave fehlschlägt.

---

## 🛠️ CODE-BLUEPRINT: KRYPTOGRAFISCHE HARDWARE-PROFILIERUNG (SWIFT/C++)

Dieser native Code-Ausschnitt illustriert, wie das System die unkopierbare Bindung an das physische Endgerät beim Initialisierungs-Handshake erzwingt:

```swift
import Foundation
import Security

class SensoriumSecurityEngine {
    
    /// Erzeugt einen unkopierbaren Hardwareschlüssel im Secure Enclave
    func initializeDeviceLock() -> Bool {
        let tag = "com.sensorium.failsafe.devicelock".data(using: .utf8)!
        
        // Parameter für die unkopierbare, hardware-gebundene Schlüsselgenerierung
        let attributes: [String: Any] = [
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecAttrKeySizeInBits as String: 256,
            kSecAttrTokenID as String: kSecAttrTokenIDSecureEnclave, // Zwingend auf dem Secure Enclave Chip
            kSecPrivateKeyAttrs as String: [
                kSecAttrIsPermanent as String: true,
                kSecAttrApplicationTag as String: tag,
                kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly // Unterbindet Kopieren & iCloud Migrations-Dienste
            ]
        ]
        
        var error: Unmanaged<CFError>?
        guard let privateKey = SecKeyCreateRandomKey(attributes as CFDictionary, &error) else {
            print("🚨 Fehler bei der Hardware-Verankerung im Secure Enclave: \(error!.takeRetainedValue().localizedDescription)")
            return false
        }
        
        print("🔒 Sensorium Hardware-Sperre erfolgreich etabliert. Das Plugin ist nun permanent an dieses physische Silizium gekoppelt.")
        return true
    }
}
```

---

## 📈 4. SCHUTZ VOR REVERSE ENGINEERING & DEKOMPILIERUNG

Um das geistige Eigentum des *Worst-Case Safe-Mode* vor Hackerangriffen zu bewahren, werden folgende Sicherheitslayer fest in den Compiler-Build-Prozess für die macOS/iOS Releases integriert:

* **LLVM Obfuscator (OLLVM):**  
  Der Quellcode wird während des Kompilierens verschleiert (Kontrollfluss-Abflachung, Instruktions-Substitution). Dadurch werden Dekompiler wie *IDA Pro* oder *Ghidra* unbrauchbar gemacht.
* **Anti-Debugging & Anti-Profiling:**  
  Beim Starten prüft das Plugin per System-Calls (`sysctl` mit `AmIBeingDebugged`), ob ein Debugger angeschlossen ist. Bei Erkennung schaltet das Plugin augenblicklich ab und löscht temporäre RAM-Zustände.
* **Kryptografische Signatur-Prüfung:**  
  Bei jedem Laden prüft das Betriebssystem die kryptografische Signatur des Sensorium-Codes. Jede Modifikation der Binärdatei führt zum sofortigen Entzug der Lauffähigkeit.
