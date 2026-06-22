import * as d3 from 'd3';
import { TrackRow } from '../../core/models/track-row';
import { getChartTheme } from '../../viz-shared/chart-theme';
import { VizTooltip } from '../../viz-shared/utils/tooltip';

export const MAJOR_GENRES = [
  'pop', 'rock', 'hip-hop', 'electronic', 'jazz', 'classical',
  'dance', 'latin', 'country', 'r&b',
];

export const GENRE_LABELS: Record<string, string> = {
  'pop': 'Pop',
  'rock': 'Rock',
  'hip-hop': 'Hip-Hop',
  'electronic': 'Electronic',
  'jazz': 'Jazz',
  'classical': 'Classical',
  'dance': 'Dance',
  'latin': 'Latin',
  'country': 'Country',
  'r&b': 'R&B',
};

const FEATURE_KEYS = ['danceability', 'energy', 'acousticness', 'valence', 'speechiness'] as const;
type FeatureKey = (typeof FEATURE_KEYS)[number];

const FEATURE_LABELS: Record<FeatureKey, string> = {
  danceability: 'Danceability',
  energy: 'Energy',
  acousticness: 'Acousticness',
  valence: 'Valence',
  speechiness: 'Speechiness',
};

const GENRE_COLORS: Record<string, string> = {
  'pop': '#4C78A8', 'rock': '#E45756', 'hip-hop': '#F58518', 'electronic': '#79706E',
  'jazz': '#54A24B', 'classical': '#B279A2', 'dance': '#EECA3B', 'latin': '#FF9DA6',
  'country': '#9D755D', 'r&b': '#BAB0AC',
};

export interface Viz05State {
  selectedGenres: Set<string>;
  sampleSize: number;
  sharedScales: boolean;
}

export interface Viz05Chart {
  resize: () => void;
  destroy: () => void;
  update: (state: Partial<Viz05State>) => void;
}

interface GenreStats {
  genre: string;
  label: string;
  color: string;
  count: number;
  data: Record<FeatureKey, number[]>;
}

function buildGenreStats(rows: TrackRow[], selectedGenres: Set<string>, sampleSize: number): GenreStats[] {
  const genreData = new Map<string, Record<FeatureKey, number[]>>();

  for (const genre of MAJOR_GENRES) {
    genreData.set(genre, {
      danceability: [], energy: [], acousticness: [], valence: [], speechiness: [],
    });
  }

  for (const row of rows) {
    const genreField = String(row.track_genre || '').toLowerCase();
    for (const genre of MAJOR_GENRES) {
      if (genreField.includes(genre)) {
        const gData = genreData.get(genre)!;
        for (const f of FEATURE_KEYS) {
          const v = Number(row[f as keyof TrackRow]);
          if (Number.isFinite(v)) gData[f].push(v);
        }
        break;
      }
    }
  }

  return MAJOR_GENRES
    .filter((g) => selectedGenres.has(g))
    .map((genre) => {
      const rawData = genreData.get(genre)!;
      const sampledData = {} as Record<FeatureKey, number[]>;

      for (const f of FEATURE_KEYS) {
        const arr = rawData[f];
        if (arr.length > sampleSize) {
          const step = arr.length / sampleSize;
          sampledData[f] = Array.from({ length: sampleSize }, (_, i) => arr[Math.floor(i * step)]);
        } else {
          sampledData[f] = [...arr];
        }
      }

      return {
        genre,
        label: GENRE_LABELS[genre],
        color: GENRE_COLORS[genre] ?? '#4C78A8',
        count: Math.min(rawData.danceability.length, sampleSize),
        data: sampledData,
      };
    })
    .filter((g) => g.count > 0);
}

function kernelDensityEstimator(kernel: (v: number) => number, X: number[]) {
  return function (V: number[]) {
    return X.map((x) => [x, d3.mean(V, (v) => kernel(x - v)) ?? 0] as [number, number]);
  };
}

function kernelEpanechnikov(k: number) {
  return function (v: number) {
    return Math.abs((v /= k)) <= 1 ? (0.75 * (1 - v * v)) / k : 0;
  };
}

export function createViz05Chart(container: HTMLElement, rows: TrackRow[], tip: VizTooltip): Viz05Chart {
  let state: Viz05State = {
    selectedGenres: new Set(['pop', 'rock', 'hip-hop', 'electronic', 'jazz', 'classical']),
    sampleSize: 250,
    sharedScales: true,
  };

  function render() {
    container.innerHTML = '';
    const theme = getChartTheme();
    const genreStats = buildGenreStats(rows, state.selectedGenres, state.sampleSize);

    if (genreStats.length === 0) return;

    const featureCount = FEATURE_KEYS.length;
    const genreCount = genreStats.length;
    const cellWidth = 140;
    const cellHeight = 100;
    const margin = { top: 50, right: 20, bottom: 20, left: 100 };
    const gridW = margin.left + featureCount * cellWidth + margin.right;
    const gridH = margin.top + genreCount * cellHeight + margin.bottom;

    const svg = d3.select(container).append('svg')
      .attr('width', gridW).attr('height', gridH)
      .attr('viewBox', `0 0 ${gridW} ${gridH}`);

    svg.append('text').attr('class', 'chart-title')
      .attr('x', gridW / 2).attr('y', 22).attr('text-anchor', 'middle')
      .text('Feature Distribution by Genre');

    FEATURE_KEYS.forEach((feature, fi) => {
      svg.append('text').attr('class', 'axis-label')
        .attr('x', margin.left + fi * cellWidth + cellWidth / 2)
        .attr('y', margin.top - 8).attr('text-anchor', 'middle')
        .style('font-size', '11px').style('font-weight', '600')
        .text(FEATURE_LABELS[feature]);
    });

    const allDensityMaxes = new Map<FeatureKey, number>();
    if (state.sharedScales) {
      const kde = kernelDensityEstimator(kernelEpanechnikov(0.1), d3.range(0, 1.01, 0.01));
      for (const feature of FEATURE_KEYS) {
        const maxVal = d3.max(genreStats.flatMap((gs) => kde(gs.data[feature]).map(([, d]) => d))) ?? 1;
        allDensityMaxes.set(feature, maxVal);
      }
    }

    genreStats.forEach((gs, gi) => {
      svg.append('text').attr('class', 'axis-label')
        .attr('x', margin.left - 8)
        .attr('y', margin.top + gi * cellHeight + cellHeight / 2 + 4)
        .attr('text-anchor', 'end')
        .style('font-size', '11px').style('fill', gs.color).style('font-weight', '600')
        .text(gs.label);

      FEATURE_KEYS.forEach((feature, fi) => {
        const cellX = margin.left + fi * cellWidth;
        const cellY = margin.top + gi * cellHeight;
        const pad = { top: 8, right: 8, bottom: 20, left: 8 };
        const w = cellWidth - pad.left - pad.right;
        const h = cellHeight - pad.top - pad.bottom;

        const thresholds = d3.range(0, 1.01, 0.01);
        const kde = kernelDensityEstimator(kernelEpanechnikov(0.1), thresholds);
        const density = kde(gs.data[feature]);

        const xScale = d3.scaleLinear().domain([0, 1]).range([0, w]);
        const maxDensity = state.sharedScales
          ? (allDensityMaxes.get(feature) ?? 1)
          : (d3.max(density, ([, d]) => d) ?? 1);
        const yScale = d3.scaleLinear().domain([0, maxDensity]).range([h, 0]);

        const cell = svg.append('g').attr('transform', `translate(${cellX + pad.left},${cellY + pad.top})`);

        const area = d3.area<[number, number]>().x(([x]) => xScale(x)).y0(h).y1(([, y]) => yScale(y)).curve(d3.curveBasis);
        const line = d3.line<[number, number]>().x(([x]) => xScale(x)).y(([, y]) => yScale(y)).curve(d3.curveBasis);

        cell.append('path').datum(density as [number, number][])
          .attr('fill', gs.color).attr('opacity', 0.2).attr('d', area);
        cell.append('path').datum(density as [number, number][])
          .attr('fill', 'none').attr('stroke', gs.color).attr('stroke-width', 1.5).attr('d', line);
        cell.append('rect').attr('width', w).attr('height', h)
          .attr('fill', 'transparent')
          .on('mouseover', (event) => {
            const mean = d3.mean(gs.data[feature]) ?? 0;
            const std = d3.deviation(gs.data[feature]) ?? 0;
            tip.show(event, `<strong>${gs.label} - ${FEATURE_LABELS[feature]}</strong><br>Mean: ${mean.toFixed(3)}<br>Std: ${std.toFixed(3)}<br>N: ${gs.count.toLocaleString()}`);
          })
          .on('mousemove', (event) => tip.move(event))
          .on('mouseout', () => tip.hide());

        if (gi === genreStats.length - 1) {
          cell.append('text').attr('x', 0).attr('y', h + 14).attr('class', 'axis-label')
            .style('font-size', '9px').style('fill', theme.textSecondary).text('0');
          cell.append('text').attr('x', w).attr('y', h + 14).attr('text-anchor', 'end')
            .attr('class', 'axis-label').style('font-size', '9px').style('fill', theme.textSecondary).text('1');
        }

        if (fi === 0) {
          cell.append('line').attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', h)
            .attr('stroke', theme.border).attr('stroke-opacity', 0.3).attr('stroke-width', 0.5);
        }
        cell.append('line').attr('x1', 0).attr('x2', w).attr('y1', h).attr('y2', h)
          .attr('stroke', theme.border).attr('stroke-opacity', 0.4).attr('stroke-width', 0.5);
      });
    });
  }

  render();

  return {
    resize: render,
    destroy: () => { container.innerHTML = ''; },
    update: (newState) => {
      state = { ...state, ...newState };
      render();
    },
  };
}
