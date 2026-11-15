# Borderplan 3D

Maak van een met de hand getekend beplantingsplan en de bijbehorende plantenlijst een 3D-border die je door het jaar heen kunt bekijken.

- **3D-border per maand en tijdstip**: bloei, herfstkleur, wintersilhouet en terugknippen in maart. De zon staat op de echte plek voor Nederland (52° NB), afhankelijk van het noorden op je tekening.
- **Planten zelf opgebouwd** uit beschrijvingen (RHS, kwekerijen): vorm, hoogte, breedte, blad- en bloemkleur en bloeimaanden. Voor specifieke cultivars bestaan geen vrij bruikbare 3D-modellen, daarom bouwt de app ze procedureel op (three.js).
- **Plan bewerken**: vakken verslepen, lengte en diepte invullen, achtergrond kiezen (schutting, taxushaag, beukenhaag, muur, open) en het noorden aanwijzen. De app controleert of de aantallen kloppen met de plantenlijst.
- **Foto inlezen**: maak een foto van de tekening en de lijst. Claude leest de vakken, nummers en plantnamen uit en zoekt gegevens op voor planten die nog niet in de bibliotheek staan.

## Opbouw

| Map | Wat |
| --- | --- |
| `src/borderplan.html` | De app zelf (één bestand: opmaak, plantenbibliotheek, 3D, editor). |
| `src/prompts.mjs` | De prompts voor het inlezen; gedeeld door app en server. |
| `scripts/build.mjs` | Bouwt `www/` (voor de app, three.js lokaal) en `dist/artifact.html` (voor de Claude-artifact). |
| `server/` | Kleine Node-server die de foto's naar Claude stuurt. De API-sleutel blijft hier, nooit in de app. |
| `capacitor.config.json` | Instellingen om de web-app als iOS- en Android-app te verpakken. |

## Lokaal draaien

```bash
npm install
npm run serve        # bouwt en opent op http://localhost:5173
```

## Server voor het inlezen van foto's

```bash
cd server
npm install
ANTHROPIC_API_KEY=... npm start     # luistert op poort 8787
```

Bouw daarna de app met het adres van de server:

```bash
BORDERPLAN_API=https://jouw-server.example npm run build
```

Omgevingsvariabelen van de server: `ANTHROPIC_API_KEY` (verplicht), `PORT`, `BORDERPLAN_MODEL` (standaard `claude-opus-5-5`) en `ALLOWED_ORIGINS` (standaard de Capacitor-origins en `http://localhost:5173`). De server staat maximaal 10 verzoeken per 10 minuten per IP-adres toe.

## iOS- en Android-app

Eenmalig de native projecten aanmaken (nodig: Android Studio en/of Xcode op een Mac):

```bash
npm install
npm run build
npx cap add android
npx cap add ios
```

Daarna:

```bash
npm run android   # opent Android Studio
npm run ios       # opent Xcode
```

App-id: `nl.borderplan3d.app`. Voor publicatie in de stores zijn een Apple Developer-account (99 dollar per jaar) en een Google Play Console-account (eenmalig 25 dollar) nodig.
