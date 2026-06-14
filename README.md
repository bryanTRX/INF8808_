# INF8808E Project

Visualisations interactives du dataset Spotify (caractéristiques audio) pour le cours INF8808E.

## Structure du projet

```
INF8808E_Project/
├── src/                    # Scripts Python (Plotly) + dataset
│   ├── dataset.csv
│   ├── data_utils.py       # Chargement & découpage des genres
│   ├── viz1.py … viz5.py   # Une viz par script
│   ├── run_all.py          # Génère tous les HTML
│   └── output/             # Exports HTML Plotly
├── website/                # Application Angular (dashboard principal)
│   └── src/app/pages/      # 10 visualisations D3
└── Project/frontend/       # Ancienne app Angular (legacy)
```

## Application web (Angular + D3)

```bash
cd website
npm install
npm start
```

Ouvrir [http://localhost:4200](http://localhost:4200)

## Visualisations Python (Plotly)

```bash
pip install -r requirements.txt
cd src
python viz1.py          # une visualisation
python run_all.py       # toutes les visualisations → src/output/
```

| Script | Graphique |
|--------|-----------|
| `viz1.py` | Coordonnées parallèles — moyennes audio par genre |
| `viz2.py` | Box plot — durée par genre |
| `viz3.py` | Barres empilées — explicite vs propre |
| `viz4.py` | Heatmaps 2D — densité des caractéristiques |
| `viz5.py` | Composition — valence par palier de popularité |

Les scripts corrigent le découpage des genres (`track_genre` peut contenir plusieurs tags séparés par `;`).

## Dataset

`src/dataset.csv` — ~90 000 titres avec caractéristiques audio Spotify.  
Copie utilisée par l'app web : `website/public/assets/dataset.csv`.
