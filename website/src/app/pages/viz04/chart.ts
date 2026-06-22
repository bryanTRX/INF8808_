import * as d3 from 'd3';
import { getChartTheme } from '../../viz-shared/chart-theme';
import { TrackRow } from '../../core/models/track-row';
import { VizTooltip } from '../../viz-shared/utils/tooltip';
import type { Lang } from '../../core/services/lang.service';

const NUMERIC_FEATURES = [
  'danceability', 'energy', 'valence', 'loudness', 'tempo',
  'acousticness', 'speechiness', 'instrumentalness', 'duration_ms',
] as const;

type Feature = (typeof NUMERIC_FEATURES)[number];

const FEATURE_LABELS_EN: Record<Feature, string> = {
  danceability: 'Danceability', energy: 'Energy', valence: 'Valence', loudness: 'Loudness',
  tempo: 'Tempo', acousticness: 'Acousticness', speechiness: 'Speechiness',
  instrumentalness: 'Instrumentalness', duration_ms: 'Duration',
};
const FEATURE_DESCRIPTIONS_EN: Record<Feature, string> = {
  danceability: 'How suitable a track is for dancing.',
  energy: 'The intensity and activity level of the track.',
  valence: 'The musical positivity conveyed by the track.',
  loudness: 'The overall loudness of the track in decibels.',
  tempo: 'The speed of the track in beats per minute.',
  acousticness: 'How likely the track is to be acoustic.',
  speechiness: 'The presence of spoken words in the track.',
  instrumentalness: 'How likely the track contains no vocals.',
  duration_ms: 'The total duration of the track in milliseconds.',
};
const L = (_lang: Lang) => ({
  labels: FEATURE_LABELS_EN,
  descriptions: FEATURE_DESCRIPTIONS_EN,
  title: 'Correlation Between Audio Features and Popularity',
  subtitle: (method: string) => `Features ranked by ${method === 'spearman' ? 'Spearman' : 'Pearson'} correlation with Spotify popularity.`,
  axisLabel: (method: string) => `${method === 'spearman' ? 'Spearman' : 'Pearson'} correlation coefficient`,
  tipMethod: 'Method',
  tipCorr: 'Correlation',
});

export type CorrelationMethod = 'pearson' | 'spearman';

function pearson(values: { x: number; y: number }[]): number {
  const meanX = d3.mean(values, (d) => d.x)!;
  const meanY = d3.mean(values, (d) => d.y)!;
  let num = 0, denX = 0, denY = 0;
  values.forEach((d) => {
    const dx = d.x - meanX, dy = d.y - meanY;
    num += dx * dy; denX += dx * dx; denY += dy * dy;
  });
  return num / Math.sqrt(denX * denY) || 0;
}

function getRanks(values: number[]): number[] {
  const sorted = values.map((value, index) => ({ value, index })).sort((a, b) => d3.ascending(a.value, b.value));
  const ranks = new Array<number>(values.length);
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1].value === sorted[i].value) j++;
    const avg = (i + j + 2) / 2;
    for (let k = i; k <= j; k++) ranks[sorted[k].index] = avg;
    i = j + 1;
  }
  return ranks;
}

function spearman(data: TrackRow[], feature: string): number {
  const values = data
    .map((d) => ({ x: Number(d[feature]), y: Number(d.popularity) }))
    .filter((d) => Number.isFinite(d.x) && Number.isFinite(d.y));
  const xRanks = getRanks(values.map((d) => d.x));
  const yRanks = getRanks(values.map((d) => d.y));
  return pearson(xRanks.map((x, i) => ({ x, y: yRanks[i] })));
}

function calculateCorrelations(data: TrackRow[], method: CorrelationMethod, lang: Lang) {
  const lbl = L(lang);
  return NUMERIC_FEATURES.map((feature) => ({
    feature,
    label: lbl.labels[feature],
    correlation: method === 'spearman'
      ? spearman(data, feature)
      : pearson(data.map((d) => ({ x: Number(d[feature]), y: Number(d.popularity) }))
          .filter((d) => Number.isFinite(d.x) && Number.isFinite(d.y))),
    description: lbl.descriptions[feature],
  })).sort((a, b) => d3.descending(a.correlation, b.correlation));
}

export interface Viz04Chart {
  setMethod: (method: CorrelationMethod) => void;
  setLang: (lang: Lang) => void;
  resize: () => void;
  destroy: () => void;
}

export function createViz04Chart(container: HTMLElement, rows: TrackRow[], tip: VizTooltip, initLang: Lang = 'fr'): Viz04Chart {
  const data = rows.filter((d) => Number.isFinite(Number(d.popularity)));
  let method: CorrelationMethod = 'pearson';
  let _lang: Lang = initLang;

  function render() {
    container.innerHTML = '';
    const lbl = L(_lang);
    const width = Math.max(640, container.clientWidth || 900);
    const height = Math.max(480, container.clientHeight || 520);
    const margin = { top: 72, right: 60, bottom: 68, left: 150 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const correlations = calculateCorrelations(data, method, _lang);
    const limit = Math.max(Math.abs(d3.min(correlations, (d) => d.correlation)!),
      Math.abs(d3.max(correlations, (d) => d.correlation)!)) + 0.03;

    const x = d3.scaleLinear().domain([-limit, limit]).range([0, innerWidth]);
    const y = d3.scaleBand().domain(correlations.map((d) => d.label)).range([0, innerHeight]).padding(0.25);

    const theme = getChartTheme();
    const svg = d3.select(container).append('svg').attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    svg.append('text').attr('class', 'chart-title').attr('x', margin.left).attr('y', 28).attr('font-size', 18)
      .text(lbl.title);
    svg.append('text').attr('class', 'chart-subtitle').attr('x', margin.left).attr('y', 50).attr('font-size', 12)
      .text(lbl.subtitle(method));

    g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(6));
    g.append('g').attr('class', 'axis').call(d3.axisLeft(y));
    g.append('line').attr('x1', x(0)).attr('x2', x(0)).attr('y1', 0).attr('y2', innerHeight).attr('stroke', theme.border);

    g.selectAll('.bar').data(correlations).join('rect').attr('class', 'bar')
      .attr('y', (d) => y(d.label)!)
      .attr('x', (d) => (d.correlation >= 0 ? x(0) : x(d.correlation)))
      .attr('width', (d) => Math.abs(x(d.correlation) - x(0)))
      .attr('height', y.bandwidth())
      .attr('fill', (d) => (d.correlation >= 0 ? '#4C78A8' : '#E45756'))
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 0.75);
        tip.show(event, `<strong>${d.label}</strong><br>${lbl.tipMethod}: ${method}<br>${lbl.tipCorr}: ${d.correlation.toFixed(3)}<br>${d.description}`);
      })
      .on('mousemove', (event) => tip.move(event))
      .on('mouseout', function () { d3.select(this).attr('opacity', 1); tip.hide(); });

    g.selectAll('.label').data(correlations).join('text')
      .attr('class', 'value-label')
      .attr('x', (d) => (d.correlation >= 0 ? x(d.correlation) + 5 : x(d.correlation) - 35))
      .attr('y', (d) => y(d.label)! + y.bandwidth() / 2 + 4)
      .attr('font-size', 12)
      .text((d) => d.correlation.toFixed(2));

    g.append('text').attr('class', 'axis-label')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 48)
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .text(lbl.axisLabel(method));
  }

  render();
  return {
    setMethod(m) { method = m; render(); },
    setLang(l) { _lang = l; render(); },
    resize: render,
    destroy: () => { container.innerHTML = ''; },
  };
}
