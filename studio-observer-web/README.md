# Studio Observer Web

Lokale, statische Ansicht für den Sensorium-Inventarstand und die Offline-Auswertung manuell erstellter Studio-Journale. Die Webapp bleibt `INVENTORY_ONLY`: `operationalApproval: NOT_GRANTED`, `hardwareAcceptance: NOT_EVALUATED`. Sie erteilt keine Betriebs-, Routing- oder Hardwarefreigabe.

## Lokal starten und prüfen

Im Ordner `studio-observer-web` mit installiertem Node.js und npm:

```sh
npm install
npm test
npm run build
```

`npm install` lädt Entwicklungsabhängigkeiten aus der konfigurierten npm-Registry. Das ist getrennt von der Verarbeitung lokaler Journale in der Webapp.

Der Build verwendet `vite build --base=./` und erzeugt einen statischen Ordner `dist/` mit relativen Asset-Pfaden. Für die lokale Ansicht kann nach der Installation ein vorhandener Vite-Prozess verwendet werden:

```sh
npx --no-install vite --host 127.0.0.1
```

Den erzeugten Build lokal ansehen:

```sh
npx --no-install vite preview --host 127.0.0.1
```

Die jeweils ausgegebene lokale URL im Browser öffnen. Die Webapp benötigt keinen eigenen Anwendungsserver, SaaS-Dienst oder Remote-MIDI-Dienst. Ein statischer Webserver liefert lediglich die App-Dateien aus.

## Daten und Aussagegrenzen

- `src/observer-snapshot.json` ist ein an Quellen gebundener Snapshot, der mit der App ausgeliefert wird. Quellenrevision, Hashes und Zeitangaben beschreiben diesen Datenstand. Seine Aktualität ist keine Echtzeitmessung und kein Nachweis einer aktuell verbundenen Sitzung. Neue Quellstände erfordern einen neuen Snapshot und Build.
- Eine lokal ausgewählte JSONL-Datei wird im Browser eingelesen und offline ausgewertet. Der Import lädt das Journal nicht zu einem Server hoch. Auch auf einer statisch gehosteten Seite bleibt die Journalverarbeitung lokal im Browser; der Host sieht die üblichen Abrufe der App-Dateien.
- Manuelle Notizen sind `USER_SIGNAL`: Angaben der bedienenden Person, keine automatisch erkannten Geräte, Plug-ins, Signalwege oder Messwerte. Eine erfolgreiche Analyse bestätigt weder Hardwarefunktion noch Audiogüte.
- Keine Hardware- oder Audioaufnahmen, kein Mikrofonzugriff und keine Web-MIDI-, USB-, HID-, Bluetooth- oder serielle Geräteverbindung. Die App scannt keine installierten Plug-ins und stellt keine Remote-MIDI-Verbindung her.
- Journaltext wird als Text angezeigt. Er darf keine HTML-Inhalte, Skripte oder zusätzlichen Ressourcen in die Seite einschleusen.

Die Browseranalyse liegt in `src/journal-analyzer.mjs`; die vendorte Node-Referenz liegt unter `tools/analyze-studio-journal.node.mjs`. Die Referenz ist kein Browser-Endpunkt und kein Dienst. Windows-Wrapper, manuelle Erfassung und deren Laufzeitprüfung bleiben außerhalb dieser Webapp.

## Prüfungen und Übergabe

`tests/web-boundary.test.mjs` prüft die vorhandenen App-Quellen auf verbotene Netzwerk-, Geräte- und HTML-Injection-Schnittstellen, externe Ressourcen, die statische Snapshot-Anbindung und die begrenzten Aussagen der Oberfläche. Fehlende erforderliche Eingaben sind keine erfolgreiche Prüfung. Direkter Aufruf:

```sh
node --test tests/web-boundary.test.mjs
```

Diese Quelltextprüfungen sind konservative Guards, kein vollständiger Laufzeit- oder Abhängigkeitsaudit. Ein Browser-Smoke muss separat mit dem konkreten Build belegt werden. Ohne diesen Nachweis gelten Browserdarstellung, Windows-Laufzeit und Hardwareakzeptanz nicht als geprüft.

Die GitHub-Übergabe erfolgt durch Main über einen isolierten neuen Branch. Diese App und ihre Tests führen weder Push noch Veröffentlichung aus. Kein Publish auf `main`, kein Überschreiben bestehender GitHub-Pages-Inhalte. Veröffentlichte Snapshots müssen vor einer gesondert autorisierten Veröffentlichung auf ihre enthaltenen Quellinformationen geprüft werden.
