# Leechblock Site

Kleine statische Seite mit Zeit-Timern fuer LeechBlock / Fokus-Weiterleitung.

## Start

- Datei `index.html` im Browser oeffnen
- Oder ueber GitHub Pages nutzen

## Dateien

- `index.html`: HTML-Struktur
- `styles.css`: Styling
- `script.js`: Timer-Logik

## GitHub Pages (einfach)

1. Repository nach GitHub pushen.
2. Auf GitHub ins Repository gehen.
3. `Settings` -> `Pages` oeffnen.
4. Bei `Source` auswaehlen: `Deploy from a branch`.
5. Branch `main` und Ordner `/ (root)` auswaehlen, dann speichern.
6. Nach kurzer Zeit erscheint oben der Live-Link zur Seite.

Hinweis: Die Seite nutzt nur relative Pfade (`./styles.css`, `./script.js`) und funktioniert damit direkt auf GitHub Pages.

## Datenschutz

Geburtsdaten werden nur lokal im Browser gespeichert (`localStorage`) und nach 30 Tagen automatisch entfernt.
Keine externen APIs, kein Backend.

## Security-Hinweise

- Content-Security-Policy per Meta-Tag (nur `self`, keine fremden Skripte/Objekte).
- Referrer-Policy: `no-referrer`.
- Permissions-Policy: browserseitige Features (z. B. Kamera/Mikrofon/Geolocation) sind deaktiviert.
