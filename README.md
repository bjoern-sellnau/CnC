# Command & Conquest

Ein 2D-Echtzeit-Strategiespiel (RTS) im Browser, angelehnt an die klassischen
*Command & Conquer*-Spiele. Geschrieben in **TypeScript** mit **HTML5 Canvas**,
gebaut mit **Vite** – ganz ohne Spiele-Engine.

![Genre](https://img.shields.io/badge/Genre-RTS-green)
![Stack](https://img.shields.io/badge/TypeScript-Canvas-blue)

## Features

- **Tile-basierte Karte** (64×64) mit zufällig generiertem Terrain
  (Gras, Sand, Fels, Wasser) und Tiberium-artigen Ressourcenfeldern.
- **Einheiten mit A\*-Wegfindung**: Soldaten, Panzer und Sammler.
  Auswahl per Klick oder Auswahlrechteck, Befehle per Rechtsklick.
- **Basisbau**: Bauhof, Kraftwerk, Raffinerie, Kaserne und Waffenfabrik
  mit Tech-Tree (Voraussetzungen) und Strom-Wirtschaft.
- **Ressourcen-Kreislauf**: Sammler ernten Tiberium, bringen es zur
  Raffinerie und füllen das Konto.
- **Kampfsystem**: Reichweite, Schaden, Trefferpunkte, Geschosse und
  Explosionen. Einheiten greifen Gegner in Sichtweite automatisch an.
- **Gegner-KI**: baut Einheiten, sammelt Ressourcen und greift in
  eskalierenden Wellen die Spielerbasis an.
- **HUD**: Seitenleiste mit Bau-Menü, Credits-/Stromanzeige und Minimap.

## Steuerung

| Aktion | Eingabe |
| --- | --- |
| Kamera bewegen | `WASD` / Pfeiltasten / Maus an den Bildschirmrand |
| Einheit(en) auswählen | Linksklick / Auswahlrechteck ziehen |
| Mehrfachauswahl | `Shift` + Linksklick |
| Bewegen / Angreifen / Ernten | Rechtsklick (Ziel bestimmt die Aktion) |
| Gebäude bauen | Button in der Seitenleiste klicken → erneut klicken, wenn „BEREIT“ → auf der Karte platzieren |
| Platzierung abbrechen | `Esc` oder Rechtsklick |

## Spielablauf

1. Baue ein **Kraftwerk** für Strom.
2. Baue eine **Raffinerie**, damit dein Sammler Credits einbringt.
3. Baue eine **Kaserne** (Soldaten) und eine **Waffenfabrik** (Panzer & Sammler).
4. Stelle eine Armee auf und zerstöre die gegnerische Basis, bevor die
   Angriffswellen deine zerstören.

Sieg: alle gegnerischen Gebäude zerstören. Niederlage: alle eigenen Gebäude verlieren.

## Entwicklung

```bash
npm install      # Abhängigkeiten installieren
npm run dev      # Dev-Server starten (http://localhost:5173)
npm run build    # Produktions-Build nach dist/
npm run preview  # Produktions-Build lokal ansehen
npm test         # Headless-Simulations-Smoke-Test
```

## Projektstruktur

```
src/
  main.ts              Einstiegspunkt & Game-Loop
  core/
    Game.ts            Zentrale Spiellogik (implementiert GameContext)
    Input.ts           Maus-/Tastatursteuerung
    config.ts          Tuning-Werte & Einheiten-/Gebäude-Tabellen
    types.ts           Gemeinsame Typen
  world/
    GameMap.ts         Tile-Karte, Terrain & Ressourcen
    Camera.ts          Viewport / Scrolling
    Pathfinding.ts     A*-Wegfindung
  entities/
    Entity.ts          Basisklasse
    Unit.ts            Bewegung, Kampf, Sammler-Logik
    Building.ts        Gebäude mit Grundfläche
  systems/
    FactionState.ts    Wirtschaft & Produktionswarteschlangen
    EnemyAI.ts         Gegner-KI
    effects.ts         Geschosse & Explosionen
  render/Renderer.ts   Zeichnet Welt, Einheiten & HUD
  ui/layout.ts         Seitenleisten-Layout
```

> Hinweis: Dies ist eine eigenständige Hommage und steht in keiner Verbindung
> zu Electronic Arts oder der *Command & Conquer*-Marke.
