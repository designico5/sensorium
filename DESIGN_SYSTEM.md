# SENSORIUM • OPEN DESIGN SYSTEM
> **Version 1.0 (Specification & Design Tokens)**  
> *Ein offenes, hochmodernes Design-System für cybernetische Interfaces, Live-Musik-Zentralen und immersive Tech-Dashboards.*

---

## 🌌 1. DESIGN PHILOSOPHIE & MOOD

Sensorium basiert auf der Ästhetik **cybernetischer Labor-Cockpits** und **High-End-Studio-Hardware**. Es kombiniert die unbarmherzige Funktionalität wissenschaftlicher Instrumente mit der einladenden Klarheit moderner Web-Software.

### Die drei Leitgedanken:
1.  **Dunkler Kosmischer Kontrast:** Tiefe, matte Schwarz- und Graphit-Töne bilden das Fundament. Farbige Akzente leuchten wie physische LEDs oder Laser-Projektionen im abgedunkelten Live-Club.
2.  **Architektonische Ehrlichkeit:** Keine dekorativen Schein-Daten ("Tech-Larping"). Jedes Element, jeder Graph und jede Partikel-Animation visualisiert echte Datenströme, Latenz-Puffer, Jitter-PLLs oder Beat-Takte.
3.  **Generöse negative Räume:** Trotz hoher Informationsdichte sorgt eine präzise Abgrenzung und Rhythmik in den Marginals dafür, dass der Performer im Scheinwerferlicht blitzschnell reagieren kann.

---

## 🎨 2. FARB-TOKENS (COLOR PALETTE)

Die Farbpalette von Sensorium besteht aus einer stark kontrastierten, dunklen "Cosmic Slate" Basis, flankiert von drei hochgradig gesättigten, lumineszenten Signalfarben.

| Token | Name | HEX Code | Tailwind Class | Funktion & Psychologische Wirkung |
| :--- | :--- | :--- | :--- | :--- |
| **`color-bg-canvas`** | Cosmic Slate Black | `#050508` | `bg-[#050508]` | Die absolute Basis. Tiefes, reflexionsarmes Schwarz mit leichtem Blaustich. |
| **`color-bg-panel`** | Void Charcoal | `#0c0d12` | `bg-[#0c0d12]` | Panel-Hintergründe, Seitenleisten und schwebende Karten. |
| **`color-accent-cyan`** | Neon Cyan | `#00f0ff` | `text-[#00f0ff]` | Datenströme, Master-Clock, Slip-Nudge, ausgehende Signale. Strahlt Fokus und Präzision aus. |
| **`color-accent-magenta`** | Electric Magenta | `#ff007f` | `text-[#ff007f]` | Aktive Beats, Trigger-Impulse, hochfrequente Hardware-Events. |
| **`color-status-green`** | Failsafe Green | `#39ff14` | `text-[#39ff14]` | Aktivierter Safe-Mode, gesunde Ports (Healthy), stabiler RAM. Signalisiert absolute Gelassenheit. |
| **`color-status-amber`** | Jitter Warning | `#f59e0b` | `text-amber-500` | Instabile Verbindungen, Paket-Verluste (Warning). |
| **`color-status-red`** | Critical Alert | `#ef4444` | `text-rose-500` | Fehlerhafte MIDI-Ports, stuck notes, Jitter-Gefahr. |

### Tailwind CSS Custom Config Blueprint:
```css
@theme {
  --color-neon-cyan: #00f0ff;
  --color-neon-magenta: #ff007f;
  --color-neon-green: #39ff14;
  
  --color-cosmic-bg: #050508;
  --color-void-panel: #0c0d12;
}
```

---

## ✍️ 3. TYPOGRAFIE-SYSTEM (TYPOGRAPHY)

Die Typografie ist das Rückgrat von Sensorium. Sie erzeugt Struktur durch eine rigorose Dreiteilung der Schrift-Familien:

1.  **Display (Überschriften): `Space Grotesk`**  
    *Eigenschaft:* Progressiv, breit laufend, geometrisch, futuristisch.  
    *Einsatz:* Tab-Titel, große Cockpit-Zahlen, Haupt-Header.
2.  **Body (Fließtext & UI): `Inter`**  
    *Eigenschaft:* Hochgradig leserlich, neutral, exzellentes Kerning, augenfreundlich bei Dunkelheit.  
    *Einsatz:* Erklärtexte, Slider-Labels, reguläre Beschriftungen.
3.  **Data/Code (Telemetrie & Status): `JetBrains Mono`**  
    *Eigenschaft:* Monospaced, wissenschaftlich, klar abgegrenzt, exzellente Ziffernlesbarkeit.  
    *Einsatz:* BPM-Anzeige, Millisekunden-Angaben, Konsolen-Protokolle, Port-IDs.

### CSS Font Imports & Theme:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700;900&family=JetBrains+Mono:wght@400;500;700&display=swap');

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui;
  --font-display: "Space Grotesk", sans-serif;
  --font-mono: "JetBrains Mono", monospace;
}
```

### Typografische Hierarchie:
*   **H1 (Display XL):** `font-display font-black text-2xl tracking-widest uppercase` (z.B. `"🚨 NOTFALL-PROTOKOLL"`)
*   **H2 (Section Header):** `font-display font-bold text-sm tracking-wider uppercase text-gray-100` (z.B. `"SIGNAL-MATRIX"`)
*   **H3 (Card Title):** `font-sans font-bold text-xs text-gray-200` (z.B. `"Setlist & Program Change"`)
*   **Telemetry Badges:** `font-mono text-[9px] uppercase tracking-widest text-neon-cyan` (z.B. `"0% JITTER"`)

---

## 🎛️ 4. INTERACTIVE KOMPONENTEN-SPEZIFIKATIONEN

Alle Komponenten sind für den rauen Bühneneinsatz konzipiert: große Trefferflächen, visuelle Reaktivität und unmissverständliches Feedback bei Berührung.

### 4.1 Die Master-Buttons
Klickbare Buttons nutzen subtile Ränder, transluzente Hintergründe und intensive Glüh-Effekte bei Aktivierung.

```tsx
// Spezifikation: Standard Akzent-Button (Neon Cyan)
<button className="px-3 py-1.5 bg-neon-cyan/10 hover:bg-neon-cyan/20 border border-neon-cyan text-neon-cyan text-xs font-mono rounded-lg transition-all duration-300 shadow-[0_0_10px_rgba(0,240,255,0.15)] hover:shadow-[0_0_15px_rgba(0,240,255,0.35)] cursor-pointer">
  ⚡ TRX INITIALISIEREN
</button>
```

### 4.2 Der Carl Cox Slip Nudge Slider
Der Phasen-Offset-Regler reagiert nicht nur funktional, sondern pulsiert wellenartig bei Interaktion.

```tsx
// Spezifikation: Nudge-Slider mit visuellem Puls-Effekt bei Nudge-Aktivierung
<div className={`space-y-1 p-2 rounded-xl border transition-all duration-300 ${isNudging ? 'bg-neon-cyan/[0.04] border-neon-cyan/35 shadow-[0_0_15px_rgba(0,240,255,0.2)] animate-pulse' : 'border-transparent'}`}>
  <input 
    type="range" 
    min="-50" 
    max="50" 
    value={gridSlipMs} 
    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-cyan transition-shadow duration-300" 
  />
</div>
```

### 4.3 Failsafe State Indicators (Geräte-Ports)
Visualisierung der Hardware-Gesundheit in Echtzeit:

*   **Healthy Status:** Pulsierender grüner Glow  
    `w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]`
*   **Warning Status:** Statisches Amber  
    `w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_#f59e0b]`
*   **Error Status:** Hochfrequent flackerndes Magenta-Rot  
    `w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_#f43f5e]`

---

## 🕸️ 5. DIE NEURONALE MATRIX (PHYSICS SVG SPECS)

Die Signal-Matrix ist eine interaktive Vektorgrafik (SVG), die von einer physikalischen Kräfte-Engine gesteuert wird. Die Verbindungen (Links) zwischen den Hardware-Nodes repräsentieren den echten Datenstrom.

### Link-Rendering mit Glow und Daten-Partikeln:
Jeder Link besteht aus drei geschichteten SVG-Pfaden, um Tiefe und Lumineszenz zu simulieren:

```xml
<g class="group/link">
  <!-- 1. Layer: Breiter, weichgezeichneter Neon-Glow im Hintergrund -->
  <path d="M..." fill="none" stroke="#00f0ff" stroke-width="8" stroke-opacity="0.25" style="filter: blur(4px);" class="transition-all duration-500" />
  
  <!-- 2. Layer: Knackscharfer, feiner Vektor-Leitungsdraht im Zentrum -->
  <path d="M..." fill="none" stroke="#00f0ff" stroke-width="1.2" stroke-opacity="0.8" />
  
  <!-- 3. Layer: Laufende Daten-Beads (Animations-Partikel) -->
  <circle r="3" fill="#ff007f" opacity="0.95" style="filter: drop-shadow(0 0 5px #ff007f);">
    <animateMotion dur="2s" repeatCount="indefinite" path="M..." />
  </circle>
</g>
```

### Die Richtungszuweisung (Signal Flow Modes):
*   **➡️ Outward (Host Clock treibt Hardware):** Partikel laufen vom Zentrum (Master-Clock) nach außen zu den Geräte-Nodes.
*   **⬅️ Inward (Hardware steuert Host-Synthesizer):** Partikel laufen von den äußeren Nodes nach innen zum Zentrum.
*   **🔄 Bidirectional Duplex (Echtzeit-Synchronisation):** Zwei gegenläufige Partikelströme fließen simultan entlang desselben Vektorpads.

---

## 🚨 6. DAS WORST-CASE NOTFALL-COCKPIT (FAILSAFE HOLOGRAM)

In einem kritischen Live-Szenario wird die Benutzeroberfläche von einem **Fullscreen-Hologramm-Schild** überlagert. Dies fokussiert das Gehirn des Performers auf das Wesentliche: die erfolgreiche Wiederherstellung des Systems.

### Design-Spezifikationen für das Overlay:
*   **Hintergrund-Dämpfung:** `#050508` bei **95% Opazität** mit einem intensiven Gaußschen Weichzeichner (`backdrop-blur-md`).
*   **Holographischer Radar-Scanner:** Ein radiales Ring-Element, das sich proportional zum Heilungs-Fortschritt von 0% auf 100% auflädt.
*   **Safe-Lock Verriegelung:** Im Zentrum der Master-Clock wird ein rotierendes, grünes Schutzschild-Icon eingebunden, das dem Musiker visuell versichert, dass das System nun gegen alle Störeinflüsse "verriegelt" ist.

---

## 🛠️ OPEN DESIGN INTEGRATION GUIDE (FOR DEVS & DESIGNERS)

### Wie verwende ich dieses Design System?
1.  **Farben importieren:** Kopieren Sie die HEX-Codes in Ihre Figma-Styles oder importieren Sie den Tailwind-Blueprint in Ihre `tailwind.config.js`.
2.  **Schriften einbinden:** Nutzen Sie den Google-Fonts Link im Header Ihres HTML-Dokuments.
3.  **UI-Komponenten nachbauen:** Verwenden Sie die spezifizierten CSS-Klassen und SVG-Strukturen, um einheitliche, perfekt synchronisierte cybernetische Dashboards zu erschaffen.
