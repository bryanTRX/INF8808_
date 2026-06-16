import * as d3 from 'd3';
import { TrackRow } from '../../core/models/track-row';
import { VizTooltip } from '../../viz-shared/utils/tooltip';
import type { Lang } from '../../core/services/lang.service';

export type HeatmapMode = 'energy-loudness' | 'speech-dance';

type ModeDef = {
  title: string; xKey: keyof TrackRow; yKey: keyof TrackRow;
  xLabel: string; yLabel: string;
  xDomain: [number, number]; yDomain: [number, number];
  color: (t: number) => string;
  btnLabel: string;
};

const MODES_EN: Record<HeatmapMode, ModeDef> = {
  'energy-loudness': {
    title: 'Track Density of Energy and Loudness',
    xKey: 'energy', yKey: 'loudness',
    xLabel: 'Energy Level (0.0 to 1.0)', yLabel: 'Loudness (Decibels)',
    xDomain: [0, 1], yDomain: [-60, 0],
    color: d3.interpolateViridis, btnLabel: 'Energy / Loudness',
  },
  'speech-dance': {
    title: 'Track Density of Speechiness and Danceability',
    xKey: 'speechiness', yKey: 'danceability',
    xLabel: 'Speechiness Level (0.0 to 1.0)', yLabel: 'Danceability Score (0.0 to 1.0)',
    xDomain: [0, 1], yDomain: [0, 1],
    color: d3.interpolatePlasma, btnLabel: 'Speech / Dance',
  },
};
const MODES_FR: Record<HeatmapMode, ModeDef> = {
  'energy-loudness': {
    title: 'Énergie et volume — Densité des titres sur tous les genres',
    xKey: 'energy', yKey: 'loudness',
    xLabel: 'Énergie (0,0 à 1,0)', yLabel: 'Volume (décibels)',
    xDomain: [0, 1], yDomain: [-60, 0],
    color: d3.interpolateViridis, btnLabel: 'Énergie / Volume',
  },
  'speech-dance': {
    title: 'Présence vocale et dansabilité — Densité des titres sur tous les genres',
    xKey: 'speechiness', yKey: 'danceability',
    xLabel: 'Parole (0,0 à 1,0)', yLabel: 'Dansabilité (0,0 à 1,0)',
    xDomain: [0, 1], yDomain: [0, 1],
    color: d3.interpolatePlasma, btnLabel: 'Parole / Danse',
  },
};

const L = (lang: Lang) => lang === 'fr'
  ? { modes: MODES_FR, trackCount: 'Nombre de titres' }
  : { modes: MODES_EN, trackCount: 'Track Count' };

export function getModeLabels(lang: Lang): Record<HeatmapMode, string> {
  const m = L(lang).modes;
  return { 'energy-loudness': m['energy-loudness'].btnLabel, 'speech-dance': m['speech-dance'].btnLabel };
}

const BINS = 50;

interface Cell { xi: number; yi: number; count: number; x0: number; x1: number; y0: number; y1: number }

function bin2d(rows: TrackRow[], cfg: ModeDef): Cell[] {
  const points = rows
    .map((d) => ({ x: Number(d[cfg.xKey]), y: Number(d[cfg.yKey]) }))
    .filter((d) => Number.isFinite(d.x) && Number.isFinite(d.y));

  const xThresholds = d3.range(cfg.xDomain[0], cfg.xDomain[1], (cfg.xDomain[1] - cfg.xDomain[0]) / BINS);
  const yThresholds = d3.range(cfg.yDomain[0], cfg.yDomain[1], (cfg.yDomain[1] - cfg.yDomain[0]) / BINS);
  const counts = new Map<string, number>();

  points.forEach((p) => {
    const xi = Math.min(BINS - 1, Math.max(0, Math.floor((p.x - cfg.xDomain[0]) / (cfg.xDomain[1] - cfg.xDomain[0]) * BINS)));
    const yi = Math.min(BINS - 1, Math.max(0, Math.floor((p.y - cfg.yDomain[0]) / (cfg.yDomain[1] - cfg.yDomain[0]) * BINS)));
    const key = `${xi},${yi}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return [...counts.entries()].map(([key, count]) => {
    const [xi, yi] = key.split(',').map(Number);
    const x0 = cfg.xDomain[0] + (xi / BINS) * (cfg.xDomain[1] - cfg.xDomain[0]);
    const x1 = cfg.xDomain[0] + ((xi + 1) / BINS) * (cfg.xDomain[1] - cfg.xDomain[0]);
    const y0 = cfg.yDomain[0] + (yi / BINS) * (cfg.yDomain[1] - cfg.yDomain[0]);
    const y1 = cfg.yDomain[0] + ((yi + 1) / BINS) * (cfg.yDomain[1] - cfg.yDomain[0]);
    return { xi, yi, count, x0, x1, y0, y1 };
  });
}

function marginalHist(values: number[], domain: [number, number], bins = 30) {
  const binner = d3.bin().domain(domain).thresholds(bins);
  return binner(values);
}

export interface Viz09Chart {
  setMode: (mode: HeatmapMode) => void;
  setLang: (lang: Lang) => void;
  resize: () => void;
  destroy: () => void;
}

export function createViz09Chart(container: HTMLElement, rows: TrackRow[], tip: VizTooltip, initLang: Lang = 'fr'): Viz09Chart {
  let mode: HeatmapMode = 'energy-loudness';
  let _lang: Lang = initLang;

  function render() {
    container.innerHTML = '';
    const lbl = L(_lang);
    const cfg = lbl.modes[mode];
    const cells = bin2d(rows, cfg);
    const maxCount = d3.max(cells, (d) => d.count) || 1;

    const width = Math.max(640, container.clientWidth || 900);
    const height = Math.max(520, container.clientHeight || 600);
    const margin = { top: 80, right: 150, bottom: 56, left: 64 };
    const topMarg = 40;
    const rightMarg = 48;
    const innerWidth = width - margin.left - margin.right - rightMarg;
    const innerHeight = height - margin.top - margin.bottom - topMarg;

    const x = d3.scaleLinear().domain(cfg.xDomain).range([0, innerWidth]);
    const y = d3.scaleLinear().domain(cfg.yDomain).range([innerHeight, 0]);
    const color = d3.scaleSequential(cfg.color).domain([0, maxCount]);

    const svg = d3.select(container).append('svg').attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

    svg.append('text').attr('class', 'chart-title').attr('x', margin.left).attr('y', 28).text(cfg.title);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top + topMarg})`);

    g.selectAll('.heat-cell').data(cells).join('rect')
      .attr('x', (d) => x(d.x0))
      .attr('y', (d) => y(d.y1))
      .attr('width', (d) => Math.max(0, x(d.x1) - x(d.x0)))
      .attr('height', (d) => Math.max(0, y(d.y0) - y(d.y1)))
      .attr('fill', (d) => color(d.count))
      .on('mouseover', (event, d) => {
        tip.show(event, `<div>${lbl.trackCount}: <span class="tooltip-value">${d.count}</span></div>
          <div>${cfg.xLabel}: ${d3.format('.2f')(d.x0)} – ${d3.format('.2f')(d.x1)}</div>
          <div>${cfg.yLabel}: ${d3.format('.2f')(d.y0)} – ${d3.format('.2f')(d.y1)}</div>`);
      })
      .on('mousemove', (event) => tip.move(event))
      .on('mouseout', () => tip.hide());

    g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(6));
    g.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(6));
    g.append('text').attr('class', 'axis-label').attr('x', innerWidth / 2).attr('y', innerHeight + 40)
      .attr('text-anchor', 'middle').text(cfg.xLabel);
    g.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2).attr('y', -48).attr('text-anchor', 'middle').text(cfg.yLabel);

    const xVals = rows.map((d) => Number(d[cfg.xKey])).filter(Number.isFinite);
    const yVals = rows.map((d) => Number(d[cfg.yKey])).filter(Number.isFinite);
    const xHist = marginalHist(xVals, cfg.xDomain);
    const yHist = marginalHist(yVals, cfg.yDomain);
    const xHistG = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const yHistG = svg.append('g').attr('transform', `translate(${margin.left + innerWidth + 8},${margin.top + topMarg})`);
    const xH = d3.scaleLinear().domain(cfg.xDomain).range([0, innerWidth]);
    const yHMax = d3.max(xHist, (d) => d.length) || 1;
    const yHScale = d3.scaleLinear().domain([0, yHMax]).range([topMarg, 0]);
    xHistG.selectAll('rect').data(xHist).join('rect')
      .attr('x', (d) => xH(d.x0 ?? 0))
      .attr('width', (d) => Math.max(0, xH(d.x1 ?? 0) - xH(d.x0 ?? 0)))
      .attr('y', (d) => yHScale(d.length)).attr('height', (d) => topMarg - yHScale(d.length))
      .attr('fill', '#94a3b8').attr('opacity', 0.7);

    const yMargMax = d3.max(yHist, (d) => d.length) || 1;
    const xHScale = d3.scaleLinear().domain([0, yMargMax]).range([0, rightMarg]);
    const yH2 = d3.scaleLinear().domain(cfg.yDomain).range([innerHeight, 0]);
    yHistG.selectAll('rect').data(yHist).join('rect')
      .attr('y', (d) => yH2(d.x1 ?? 0))
      .attr('height', (d) => Math.max(0, yH2(d.x0 ?? 0) - yH2(d.x1 ?? 0)))
      .attr('x', 0).attr('width', (d) => xHScale(d.length))
      .attr('fill', '#94a3b8').attr('opacity', 0.7);

    const legendH = 120;
    const legendW = 14;
    const legendScale = d3.scaleLinear().domain([0, maxCount]).range([legendH, 0]);
    const legendG = svg.append('g').attr('transform', `translate(${width - margin.right + 20},${margin.top + topMarg})`);
    const legendData = d3.range(legendH).map((i) => legendScale.invert(i));
    legendG.selectAll('rect').data(legendData).join('rect')
      .attr('y', (_, i) => i).attr('width', legendW).attr('height', 1)
      .attr('fill', (d) => color(d));
    legendG.append('g').attr('transform', `translate(${legendW + 4},0)`)
      .call(d3.axisRight(legendScale).ticks(4).tickFormat(d3.format('~s')));
    legendG.append('text').attr('class', 'legend-label').attr('x', 0).attr('y', -6).attr('font-size', 10).text(lbl.trackCount);
  }

  render();
  return {
    setMode(m) { mode = m; render(); },
    setLang(l) { _lang = l; render(); },
    resize: render,
    destroy: () => { container.innerHTML = ''; },
  };
}
