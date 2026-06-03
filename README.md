# Command & Conquest

Ein 2D-Echtzeit-Strategiespiel (RTS) im Browser, angelehnt an die klassischen
*Command & Conquer*-Spiele. Geschrieben in **TypeScript** mit **HTML5 Canvas**,
gebaut mit **Vite** – ganz ohne Spiele-Engine.

![Genre](https://img.shields.io/badge/Genre-RTS-green)
![Stack](https://img.shields.io/badge/TypeScript-Canvas-blue)

## Features

- **EVE-Boot-Intro im CRT-Stil**: ein **[BOOT UP EVE]**-Button (aktiviert Audio),
  dann eine Command-&-Conquer-artige Boot-Sequenz, die mit „WELCOME, COMMANDER"
  ins Menü übergeht. Phosphor-grünes Terminal-Look mit Scanlines (in Optionen
  abschaltbar).
- **3 spielbare Parteien** mit eigenem Roster, Tech-Tree, Wappen und Superwaffe.
  Auswahl über CRT-Fraktionskarten mit Doktrin und Stat-Balken:
  - **Vanguard Coalition** (grün, Hexagon) – Festungen/Stahl, *Orbitallaser*
  - **Kröwn Syndicate** (orange, Krone) – Schwärme/Tempo, *Nuklearrakete*
  - **Choralität** (violett, Ringe) – Energie/Tech/Tarnung, *EMP-Sturm*
- **Superwaffen** mit Ladezeit: bei „BEREIT" mit Taste **T** ein Ziel anvisieren.
  Die KI setzt ihre Superwaffe ebenfalls ein.
- **Schwierigkeitsgrade** (Leicht/Normal/Schwer): skalieren Gegner-Wirtschaft,
  Wellengröße/-takt und den Schaden gegen den Spieler.
- **Prozedurale Musik** im C&C-Stil (mehrere Tracks, Web Audio, keine Dateien) –
  ein-/ausschalten mit **N**.
- **Startmenü** zur Auswahl von Partei, Schwierigkeit und Mission.
- **Einsatzbericht (Debriefing)** im C&C-Stil nach Sieg/Niederlage: Einsatzdauer,
  gebaute/verlorene Einheiten, vernichtete Gegner, gesammeltes Tiberium und ein
  Punktestand (ohne FMV).
- **3 Missionen** unterschiedlicher Schwierigkeit (eigene Karten per Seed).
- **Nebel des Krieges**: unerkundetes Gebiet ist schwarz, erkundetes bleibt
  abgedunkelt sichtbar, gegnerische Einheiten erscheinen nur im aktuellen Sichtfeld.
- **Tile-basierte Karte** (64×64) mit prozedural generiertem Terrain
  (Gras, Sand, Fels, Wasser) und Tiberium-artigen Ressourcenfeldern.
- **6 Einheitentypen mit A\*-Wegfindung**, inkl. Flug- und Artillerie-Einheiten.
  Auswahl per Klick oder Auswahlrechteck, Befehle per Rechtsklick.
- **7 Gebäudetypen** mit Tech-Tree und Strom-Wirtschaft, inkl. Verteidigung.
- **Basis-Management**: Sammler verteilen sich automatisch auf freie Felder und
  lassen sich einer Raffinerie fest zuweisen; primäre Kaserne/Fahrzeughalle
  wählbar; Gebäude verkaufen (50 % zurück) oder vom Strom nehmen; bei Strommangel
  fällt das Radar (Minimap) aus.
- **Ressourcen-Kreislauf**: Sammler ernten Tiberium, bringen es zur
  Raffinerie und füllen das Konto.
- **Kampfsystem**: Reichweite, Schaden, Trefferpunkte, Geschosse, Explosionen
  und **Flächenschaden** (Artillerie). Einheiten und Geschütztürme greifen
  Gegner in Reichweite automatisch an.
- **Partikeleffekte** bei Treffern und Explosionen – Infanterie blutet rot,
  Fahrzeuge/Gebäude werfen Trümmer und Funken.
- **Tooltips**: Mauszeiger über eine Einheit/Gebäude zeigt Name, HP & Werte
  (gegnerische nur im Sichtfeld).
- **Parallele Produktion**: mehrere Kasernen bzw. Waffenfabriken bauen
  entsprechend mehr Einheiten gleichzeitig; Infanterie und Fahrzeuge laufen
  ohnehin auf getrennten Produktionslinien.
- **Gegner-KI**: baut Einheiten, sammelt Ressourcen, befestigt ihre Basis und
  greift in eskalierenden Wellen an.
- **Sound** komplett prozedural über die Web Audio API erzeugt (keine Dateien),
  inkl. Explosions-/Zerstörungs-Sounds bei vernichteten Einheiten & Gebäuden.
- **Debug-Modus** (`F3`): visualisiert für ausgewählte Einheiten die vom
  A\*-Algorithmus untersuchten Felder, den gewählten Pfad, das Ziel und den
  Sichtradius – plus ein Info-Panel.
- **HUD**: Seitenleiste mit Bau-Menü, Credits-/Stromanzeige und Minimap.

## Einheiten

| Einheit | Rolle | Bau in |
| --- | --- | --- |
| Soldat | Günstige Standard-Infanterie | Kaserne |
| Raketensoldat | Anti-Fahrzeug-Infanterie, hohe Reichweite | Kaserne |
| Panzer | Robuste Hauptkampfeinheit | Waffenfabrik |
| Artillerie | Lange Reichweite, **Flächenschaden**, langsam | Waffenfabrik |
| Kampfhubschrauber | Schnell, **fliegt** über Hindernisse | Waffenfabrik |
| Sammler | Erntet Tiberium für Credits | Waffenfabrik |

## Gebäude

| Gebäude | Funktion | Voraussetzung |
| --- | --- | --- |
| Bauhof | Zentrum der Basis | – |
| Kraftwerk | Liefert Strom | – |
| Raffinerie | Sammler laden hier ab | Kraftwerk |
| Kaserne | Produziert Infanterie | Kraftwerk |
| Waffenfabrik | Produziert Fahrzeuge & Flugzeuge | Raffinerie |
| Geschützturm | Feuert automatisch auf Gegner | Kaserne |
| Mauer | Blockiert gegnerische Einheiten | – |

## Steuerung

| Aktion | Eingabe |
| --- | --- |
| Mission wählen | Im Startmenü auf eine Missionskarte klicken |
| Kamera bewegen | `WASD` / Pfeiltasten / Maus an den Bildschirmrand |
| Einheit(en) auswählen | Linksklick / Auswahlrechteck ziehen |
| Mehrfachauswahl | `Shift` + Linksklick |
| Bewegen / Angreifen / Ernten | Rechtsklick (Ziel bestimmt die Aktion) |
| Gebäude bauen | Button in der Seitenleiste klicken → erneut klicken, wenn „BEREIT“ → auf der Karte platzieren |
| Produktion abbrechen | Rechtsklick auf den Bau-Button (Kosten werden erstattet) |
| Platzierung abbrechen | `Esc` oder Rechtsklick |
| Sammler einer Raffinerie zuweisen | Sammler wählen → Rechtsklick auf eine eigene Raffinerie |
| Primäre Kaserne/Fahrzeughalle | Eigenes Produktionsgebäude anklicken (★ markiert es) |
| Gebäude verkaufen | `K` → Gebäude anklicken (50 % Erstattung) |
| Gebäude an/aus (Strom) | `B` → Gebäude anklicken |
| Superwaffe abfeuern | `T` (wenn „BEREIT") → Ziel anklicken |
| Sound an/aus | `M` · Musik an/aus: `N` |
| Debug-Overlay (Wegfindung) | `F3` oder `` ` `` – zeigt für ausgewählte Einheiten die A\*-Suche & den Pfad |
| Zurück ins Menü | Klick auf den Sieg-/Niederlage-Bildschirm |

## Spielablauf

1. Baue eine **Raffinerie**, damit dein Sammler Credits einbringt
   (achte auf genug **Strom** durch Kraftwerke).
2. Baue eine **Kaserne** (Infanterie) und eine **Waffenfabrik**
   (Panzer, Artillerie, Hubschrauber, Sammler).
3. Sichere deine Basis mit **Geschütztürmen** und **Mauern** gegen die Wellen.
4. Stelle eine Armee auf und zerstöre die gegnerische Basis.

Sieg: alle gegnerischen Gebäude zerstören. Niederlage: alle eigenen Gebäude verlieren.

## Entwicklung

```bash
npm install      # Abhängigkeiten installieren
npm run dev      # Dev-Server starten (http://localhost:5173)
npm run build    # Produktions-Build nach dist/ (zählt die Build-Nr. hoch)
npm run build:ci # Build ohne Hochzählen (wird im Deploy genutzt)
npm run preview  # Produktions-Build lokal ansehen
npm test         # Headless-Simulations-Smoke-Test
```

Die Build-Nummer im Footer (`build 0.x`) wird bei jedem `npm run build`
automatisch erhöht (`scripts/bump-build.mjs` → `src/version.ts`).

## Projektstruktur

```
src/
  main.ts              Einstiegspunkt, Menü-/Spiel-Zustandsmaschine & Game-Loop
  core/
    Game.ts            Zentrale Spiellogik (implementiert GameContext)
    Input.ts           Maus-/Tastatursteuerung
    config.ts          Tuning-Werte & Einheiten-/Gebäude-Tabellen
    missions.ts        Missions-/Karten-Definitionen
    types.ts           Gemeinsame Typen
  world/
    GameMap.ts         Tile-Karte, Terrain & Ressourcen (seedbar)
    FogOfWar.ts        Sichtbarkeit / Nebel des Krieges
    Camera.ts          Viewport / Scrolling
    Pathfinding.ts     A*-Wegfindung
  entities/
    Entity.ts          Basisklasse
    Unit.ts            Bewegung, Kampf, Flug- & Sammler-Logik
    Building.ts        Gebäude mit Grundfläche & Verteidigung
  systems/
    FactionState.ts    Wirtschaft & Produktionswarteschlangen
    EnemyAI.ts         Gegner-KI
    Sound.ts           Prozedurale Soundeffekte (Web Audio)
    effects.ts         Geschosse & Explosionen
  render/Renderer.ts   Zeichnet Welt, Einheiten, Nebel & HUD
  ui/
    layout.ts          Seitenleisten-Layout
    Menu.ts            Startmenü mit Missionsauswahl
```

> Hinweis: Dies ist eine eigenständige Hommage und steht in keiner Verbindung
> zu Electronic Arts oder der *Command & Conquer*-Marke.
