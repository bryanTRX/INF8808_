# MusicInsights — INF8808E

Interactive dashboard exploring the audio characteristics of ~90,000 Spotify tracks through ten D3.js visualizations. Built as part of the course **INF8808E — Data Visualization** at Polytechnique Montréal.

---

## Overview

The application addresses a central question: **what does a hit song actually sound like?**

Each chapter targets a specific analytical question — how genres differ sonically, which audio features correlate with popularity, what duration maximizes streams, and where the most popular artists sit in audio space.

| # | Visualization | Question |
|---|---------------|----------|
| 1 | Parallel coordinates | What are the sonic fingerprints of genre families? |
| 2 | Box plots | Which genres have the longest tracks? |
| 3 | 100% stacked bars | How does explicit content share vary by genre? |
| 4 | Feature correlation | Which audio features best predict popularity? |
| 5 | Faceted scatter plot | Does tempo predict danceability across genres? |
| 6 | Acousticness vs popularity | Do Pop and Rock respond differently to acousticness? |
| 7 | Duration vs popularity | Is there an ideal track length to maximize popularity? |
| 8 | Popularity-tier breakdown | Do audio features shift across popularity tiers? |
| 9 | 2D density heatmaps | Where do 90,000 tracks cluster in audio space? |
| 10 | Artist dashboard | What is the audio profile of the 12 most represented artists? |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Angular 19 (standalone components, signals) |
| Visualizations | D3.js v7 |
| Styles | CSS custom properties (light / dark themes) |
| Data | CSV (~90,000 rows) loaded client-side |
| Prototyping | Python + Plotly |

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Install and run

```bash
cd website
npm install
npm start
```

The app is available at [http://localhost:4200](http://localhost:4200).

### Production build

```bash
cd website
npm run build
```

Compiled files are output to `website/dist/`.

---

## Project Structure

```
INF8808_/
├── website/                        # Main Angular application
│   ├── public/assets/
│   │   ├── dataset.csv             # Spotify dataset (~90,000 tracks)
│   │   └── top-12-performers.json  # Top 12 artists
│   └── src/app/
│       ├── core/
│       │   ├── i18n/               # App strings and viz status messages
│       │   ├── models/             # TypeScript interfaces (TrackRow)
│       │   └── services/           # LangService, ThemeService, VizDataService
│       ├── pages/
│       │   ├── viz01/ … viz10/     # One Angular component + D3 chart per visualization
│       │   └── home/               # Landing page with narrative prologue
│       └── viz-shared/
│           └── utils/              # Reusable helpers (tooltip, resize, theme…)
```

---

## Dataset

The file `website/public/assets/dataset.csv` contains approximately **90,000 Spotify tracks** with the following audio features:

| Column | Description |
|--------|-------------|
| `track_name` | Track title |
| `artists` | Artist(s) |
| `track_genre` | Spotify genre(s) — may include multiple tags |
| `popularity` | Spotify popularity score (0–100) |
| `danceability` | How suitable the track is for dancing (0–1) |
| `energy` | Intensity and activity level (0–1) |
| `valence` | Musical positivity (0–1) |
| `acousticness` | Acoustic level (0–1) |
| `speechiness` | Presence of spoken words (0–1) |
| `instrumentalness` | Likelihood of no vocals (0–1) |
| `tempo` | Speed in BPM |
| `loudness` | Volume in decibels |
| `duration_ms` | Duration in milliseconds |

---

## Interface Features

- **Dark / light theme** — respects system preference, toggleable manually
- **Side navigation** — direct access to each chapter
- **Rich tooltips** — detailed information on hover for every data point or bar
- **Interactive controls** — filters, sorting, search, and sample-size sliders per visualization

---

## Team

| Name |
|------|
| Nimet Tshienda Mulji |
| Bryan Alexandre Tavares |
| Eugenia Carcea |
| Kylian Kouassi |
| Le Minh Hoang Pham |
| Sepideh Memand |

Course: INF8808E — Data Visualization  
Polytechnique Montréal — Summer 2026
