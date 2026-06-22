import type { Lang } from '../../core/services/lang.service';
import * as d3 from 'd3';
import { TrackRow } from '../../core/models/track-row';
import { CHART, styleAxis } from '../../viz-shared/utils/chart-theme';
import { VizTooltip } from '../../viz-shared/utils/tooltip';

const HEX_PAIRS_EN = [
  { xKey: 'energy'       as const, yKey: 'loudness'   as const, xLabel: 'Energy',        yLabel: 'Loudness (dB)', xDom: [0,1]    as [number,number], yDom: [-60,0]  as [number,number] },
  { xKey: 'danceability' as const, yKey: 'valence'    as const, xLabel: 'Danceability',   yLabel: 'Valence',       xDom: [0,1]    as [number,number], yDom: [0,1]    as [number,number] },
  { xKey: 'acousticness' as const, yKey: 'energy'     as const, xLabel: 'Acoustic',       yLabel: 'Energy',        xDom: [0,1]    as [number,number], yDom: [0,1]    as [number,number] },
  { xKey: 'tempo'        as const, yKey: 'popularity' as const, xLabel: 'Tempo (BPM)',    yLabel: 'Popularity',    xDom: [50,220] as [number,number], yDom: [0,100]  as [number,number] },
] as const;
export const HEX_PAIRS = HEX_PAIRS_EN;
export function getHexPairs(_lang: Lang) { return HEX_PAIRS_EN as readonly HexPairDef[]; }
const L = (_lang: Lang) => ({
  pairs: HEX_PAIRS_EN as readonly HexPairDef[],
  title: (y: string, x: string) => `Hexagonal Density: ${y} vs ${x}`,
  hint: 'Each hexagon shows how many tracks fall in that area. Darker hexagons indicate a higher concentration of tracks.',
  tracks: 'Tracks',
});

export type HexPairIdx = 0 | 1 | 2 | 3;

interface HexPairDef { xKey: keyof TrackRow; yKey: keyof TrackRow; xLabel: string; yLabel: string; xDom: [number, number]; yDom: [number, number] }
interface Hexbin { x: number; y: number; count: number; xi: number; yi: number }

const HEXBIN_COLS = 40;
const HEXBIN_ROWS = 40;

function hexbinData(rows: TrackRow[], cfg: HexPairDef): Hexbin[] {
  const pts = rows
    .map((r) => ({ x: Number(r[cfg.xKey]), y: Number(r[cfg.yKey]) }))
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

  const counts = new Map<string, number>();
  pts.forEach((p) => {
    const xi = Math.min(HEXBIN_COLS - 1, Math.max(0,
      Math.floor((p.x - cfg.xDom[0]) / (cfg.xDom[1] - cfg.xDom[0]) * HEXBIN_COLS)));
    const yi = Math.min(HEXBIN_ROWS - 1, Math.max(0,
      Math.floor((p.y - cfg.yDom[0]) / (cfg.yDom[1] - cfg.yDom[0]) * HEXBIN_ROWS)));
    const k = `${xi},${yi}`;
    counts.set(k, (counts.get(k) || 0) + 1);
  });

  return [...counts.entries()].map(([k, count]) => {
    const [xi, yi] = k.split(',').map(Number);
    const xR = (cfg.xDom[1] - cfg.xDom[0]) / HEXBIN_COLS;
    const yR = (cfg.yDom[1] - cfg.yDom[0]) / HEXBIN_ROWS;
    return { xi, yi, count, x: cfg.xDom[0] + (xi + 0.5) * xR, y: cfg.yDom[0] + (yi + 0.5) * yR };
  });
}

export interface Viz14Chart {
  setPair: (idx: HexPairIdx) => void;
  setLang: (l: Lang) => void;
  resize: () => void;
  destroy: () => void;
}

export function createViz14Chart(container: HTMLElement, rows: TrackRow[], tip: VizTooltip, initLang: Lang = 'en'): Viz14Chart {
  let pairIdx: HexPairIdx = 0, _lang = initLang;

  function render() {
    container.innerHTML = '';
    const lbl  = L(_lang);
    const cfg  = lbl.pairs[pairIdx];
    const bins = hexbinData(rows, cfg);
    const maxC = d3.max(bins, (d) => d.count) || 1;

    const width  = Math.max(580, container.clientWidth || 840);
    const height = Math.max(480, container.clientHeight || 540);
    const margin = { top: 72, right: 80, bottom: 52, left: 68 };
    const iW     = width  - margin.left - margin.right;
    const iH     = height - margin.top  - margin.bottom;

    const x    = d3.scaleLinear().domain(cfg.xDom).range([0, iW]);
    const y    = d3.scaleLinear().domain(cfg.yDom).range([iH, 0]);
    const hexR = Math.min(iW / HEXBIN_COLS, iH / HEXBIN_ROWS) * 0.6;
    const colorScale = d3.scaleSequential(d3.interpolateInferno).domain([0, maxC]);

    // Hexagon path generator
    const hexPath = (r: number) => {
      const pts = d3.range(6).map((i) => {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        return [r * Math.cos(a), r * Math.sin(a)];
      });
      return `M${pts.map((p) => p.join(',')).join('L')}Z`;
    };

    const svg = d3.select(container).append('svg').attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);
    const g   = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    svg.append('text').attr('x', margin.left).attr('y', 22).attr('fill', CHART.text).attr('font-size', 15).attr('font-weight', 700).text(lbl.title(cfg.yLabel, cfg.xLabel));
    svg.append('text').attr('x', margin.left).attr('y', 42).attr('fill', CHART.muted).attr('font-size', 11).text(lbl.hint);

    g.selectAll('.hex').data(bins).join('path').attr('class', 'hex')
      .attr('d', hexPath(hexR))
      .attr('transform', (d) => `translate(${x(d.x)},${y(d.y)})`)
      .attr('fill', (d) => colorScale(d.count))
      .attr('stroke', 'none')
      .on('mouseover', (event, d) => {
        tip.show(event,
          `<div>${d.count.toLocaleString()} ${lbl.tracks}</div>
           <div>${cfg.xLabel} : <span class="tooltip-value">${d3.format('.2f')(d.x)}</span></div>
           <div>${cfg.yLabel} : <span class="tooltip-value">${d3.format('.2f')(d.y)}</span></div>`);
      })
      .on('mousemove', (event) => tip.move(event))
      .on('mouseout', () => tip.hide());

    const xAx = g.append('g').attr('class', 'axis').attr('transform', `translate(0,${iH})`).call(d3.axisBottom(x).ticks(6));
    const yAx = g.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(6));
    styleAxis(xAx as never);
    styleAxis(yAx as never);

    g.append('text').attr('class', 'axis-label').attr('x', iW / 2).attr('y', iH + 40)
      .attr('text-anchor', 'middle').attr('fill', CHART.secondary).text(cfg.xLabel);
    g.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)')
      .attr('x', -iH / 2).attr('y', -52).attr('text-anchor', 'middle').attr('fill', CHART.secondary).text(cfg.yLabel);

    // Color legend (vertical)
    const lH  = 120;
    const lW  = 14;
    const lG  = svg.append('g').attr('transform', `translate(${width - margin.right + 14},${margin.top})`);
    const lSc = d3.scaleLinear().domain([0, maxC]).range([lH, 0]);
    lG.selectAll('rect').data(d3.range(lH)).join('rect')
      .attr('y', (_, i) => i).attr('width', lW).attr('height', 1)
      .attr('fill', (d) => colorScale(lSc.invert(d)));
    lG.append('g').attr('transform', `translate(${lW + 4},0)`)
      .call(d3.axisRight(lSc).ticks(4).tickFormat(d3.format('~s')));
    lG.append('text').attr('x', 0).attr('y', -8).attr('fill', CHART.muted).attr('font-size', 10).text(lbl.tracks);
  }

  render();
  return {
    setPair(idx) { pairIdx = idx; render(); },
    setLang(l) { _lang = l; render(); },
    resize: render,
    destroy: () => { container.innerHTML = ''; },
  };
}
