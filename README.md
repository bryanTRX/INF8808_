# MusicInsights — INF8808E

Dashboard interactif explorant les caractéristiques audio de ~90 000 titres Spotify à travers dix visualisations D3.js. Projet réalisé dans le cadre du cours **INF8808E — Visualisation de données** à Polytechnique Montréal.

---

## Aperçu

L'application répond à une question centrale : **à quoi ressemble vraiment un tube ?**

Chaque chapitre cible une question analytique précise — comment les genres diffèrent sur le plan sonore, quelles caractéristiques audio corrèlent avec la popularité, quelle durée maximise les streams, et où se situent les artistes les plus populaires dans l'espace audio.

| # | Visualisation | Question |
|---|---------------|----------|
| 1 | Coordonnées parallèles | Quelles sont les empreintes sonores des familles de genres ? |
| 2 | Boîtes à moustaches | Quels genres ont les titres les plus longs ? |
| 3 | Barres empilées 100 % | Comment varie la proportion de contenu explicite par genre ? |
| 4 | Corrélation des caractéristiques | Quelles caractéristiques audio prédisent la popularité ? |
| 5 | Nuage de points facetté | Le tempo prédit-il la dansabilité selon le genre ? |
| 6 | Acousticité vs popularité | Pop et Rock réagissent-ils différemment à l'acousticité ? |
| 7 | Durée vs popularité | Existe-t-il une durée idéale pour maximiser la popularité ? |
| 8 | Composition par paliers | Les caractéristiques audio varient-elles selon le niveau de popularité ? |
| 9 | Cartes de densité 2D | Où se concentrent les 90 000 titres dans l'espace audio ? |
| 10 | Tableau de bord artiste | Quel est le profil audio des 12 artistes les plus représentés ? |

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Angular 19 (standalone components, signals) |
| Visualisations | D3.js v7 |
| Styles | CSS custom properties (thèmes clair/sombre) |
| Données | CSV (~90 000 lignes) chargé côté client |
| Internationalisation | Bilingue français/anglais (sans librairie externe) |
| Prototypage initial | Python + Plotly |

---

## Lancer l'application

### Prérequis

- Node.js 18+ et npm

### Installation et démarrage

```bash
cd website
npm install
npm start
```

L'application est accessible sur [http://localhost:4200](http://localhost:4200).

### Build de production

```bash
cd website
npm run build
```

Les fichiers compilés sont générés dans `website/dist/`.

---

## Structure du projet

```
INF8808_/
├── website/                        # Application Angular principale
│   ├── public/assets/
│   │   ├── dataset.csv             # Jeu de données Spotify (~90 000 titres)
│   │   ├── top-12-performers.json  # Top 12 artistes
│   │   └── logo.png                # Logo du projet
│   └── src/app/
│       ├── core/
│       │   ├── i18n/               # Chaînes de texte FR/EN
│       │   ├── models/             # Interfaces TypeScript (TrackRow)
│       │   └── services/           # LangService, ThemeService, VizDataService
│       ├── pages/
│       │   ├── viz01/ … viz10/     # Un composant Angular + chart D3 par visualisation
│       │   └── home/               # Page d'accueil avec prologue narratif
│       └── viz-shared/
│           ├── utils/              # Helpers réutilisables (tooltip, resize, theme…)
│           ├── viz-catalog.ts      # Métadonnées de toutes les visualisations (EN)
│           └── catalog.fr.ts       # Métadonnées en français
```

---

## Dataset

Le fichier `website/public/assets/dataset.csv` contient environ **90 000 titres Spotify** avec les caractéristiques audio suivantes :

| Colonne | Description |
|---------|-------------|
| `track_name` | Nom du titre |
| `artists` | Artiste(s) |
| `track_genre` | Genre(s) Spotify (peut contenir plusieurs tags) |
| `popularity` | Score de popularité Spotify (0–100) |
| `danceability` | Facilité à danser sur le titre (0–1) |
| `energy` | Intensité et activité (0–1) |
| `valence` | Positivité musicale (0–1) |
| `acousticness` | Niveau acoustique (0–1) |
| `speechiness` | Présence de paroles (0–1) |
| `instrumentalness` | Probabilité d'absence de voix (0–1) |
| `tempo` | Vitesse en BPM |
| `loudness` | Volume en décibels |
| `duration_ms` | Durée en millisecondes |

---

## Fonctionnalités de l'interface

- **Bilingue** — basculez entre français et anglais depuis la barre supérieure
- **Thème clair/sombre** — préférence système respectée, modifiable manuellement
- **Navigation latérale** — accès direct à chaque chapitre
- **Tooltips riches** — informations détaillées au survol de chaque point ou barre
- **Contrôles interactifs** — filtres, tri, recherche, curseurs d'échantillon selon la visualisation

---

## Équipe

Projet réalisé dans le cadre du cours INF8808E — Visualisation de données  
Polytechnique Montréal, session Été 2026
