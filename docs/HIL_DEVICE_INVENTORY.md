# HIL-Geräteinventur

[`hil-device-inventory.json`](./hil-device-inventory.json) ist die verbindliche Startliste für reale Hardware-in-the-loop-Abnahmen. Sie ist bewusst additiv: Für jedes weitere Gerät wird ein eigener Eintrag ergänzt, ohne bestehende Profile zu überschreiben.

Die Einträge sind Zielprofile und noch keine Messnachweise. `OWNER_INPUT_REQUIRED` muss vor einem Test mit dem exakten Modell, Firmwarestand, Treiber und Betriebssystem ersetzt werden. Ein `PASS` darf erst in einem separaten Evidence-Record unter `evidence/stage/` stehen, der gegen [`stage-evidence.schema.json`](./stage-evidence.schema.json) validiert wurde.

Mindestens zu erfassen sind:

- exakte Modell-/SKU-Bezeichnung und Serien- oder Inventarnummer
- Firmware, Treiber und Betriebssystem-Build
- Port, Kabel, Bus oder Netzwerkpfad
- zugehörige Matrix-IDs und erwartetes Verhalten
- gemessene Latenz, Jitter, Ausfallverhalten und Recovery-Zeit
- unveränderliche Logreferenz, Datum und verantwortlicher Prüfer

Die Datei enthält absichtlich keine simulierten Messwerte und keinen voreiligen `PASS`-Status. Für eine unbeschränkte Gerätezahl werden weitere Profile nach demselben Schema ergänzt.

Vor jedem Review prüft `node scripts/validate-stage-evidence.mjs` alle vorhandenen JSON-Records unter `evidence/stage/`. Ein leerer Ordner wird ausdrücklich als „keine Nachweise vorhanden“ gemeldet; er wird niemals als bestanden interpretiert. Ungültige Records, unbekannte Felder, negative Messwerte und Platzhalter in `PASS`-Records brechen die Prüfung ab.
