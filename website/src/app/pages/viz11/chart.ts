import * as d3 from 'd3';
import type { Lang } from '../../core/services/lang.service';
import { TrackRow } from '../../core/models/track-row';
import { CHART, styleAxis } from '../../viz-shared/utils/chart-theme';
import { explodeByGenre, topGenresByMedianPopularity } from '../../viz-shared/utils/data-helpers';
import { VizTooltip } from '../../viz-shared/utils/tooltip';

export type EnergyFeature = 'energy' | 'loudness' | 'valence' | 'danceability' | 'tempo';

const FEATURES_FR: { key: EnergyFeature; label: string; unit: string; domain: [number, number] }[] = [
  { key: 'energy',       label: 'Énergie',      unit: '',     domain: [0, 1]    },
  { key: 'danceability', label: 'Dansabilité',   unit: '',     domain: [0, 1]    },
  { key: 'valence',      label: 'Valence',       unit: '',     domain: [0, 1]    },
  { key: 'loudness',     label: 'Volume (dB)',   unit: ' dB',  domain: [-60, 0]  },
  { key: 'tempo',        label: 'Tempo (BPM)',   unit: ' BPM', domain: [60, 200] },
];
const FEATURES_EN: typeof FEATURES_FR = [
  { key: 'energy',       label: 'Energy',        unit: '',     domain: [0, 1]    },
  { key: 'danceability', label: 'Danceability',   unit: '',     domain: [0, 1]    },
  { key: 'valence',      label: 'Valence',        unit: '',     domain: [0, 1]    },
  { key: 'loudness',     label: 'Loudness (dB)',  unit: ' dB',  domain: [-60, 0]  },
  { key: 'tempo',        label: 'Tempo (BPM)',    unit: ' BPM', domain: [60, 200] },
];
export const ENERGY_FEATURES = FEATURES_FR;
export function getEnergyFeatures(lang: Lang) { return lang === 'fr' ? FEATURES_FR : FEATURES_EN; }
const L = (lang: Lang) => lang === 'fr' ? {
  features: FEATURES_FR,
  title: (lbl: string, n: number) => `${lbl} moyenne par genre parmi les top ${n} genres`,
  hint: 'Les barres indiquent la moyenne. Les lignes délimitent le premier et le troisième quartile. Les genres sont classés du plus élevé au plus faible.',
  tip: { avg: 'moy.', tracks: 'titres' },
} : {
  features: FEATURES_EN,
  title: (lbl: string, n: number) => `Average ${lbl} by genre across the top ${n} genres`,
  hint: 'Bars show the mean value. Lines mark the Q1 and Q3 quartiles. Genres are sorted from highest to lowest.',
  tip: { avg: 'avg.', tracks: 'tracks' },
};

interface GenreBar {
  genre: string;
  value: number;
  count: number;
  q1: number;
  q3: number;
}

export interface Viz11Chart {
  setFeature: (f: EnergyFeature) => void;
  setLang: (l: Lang) => void;
  resize: () => void;
  destroy: () => void;
}

export function createViz11Chart(container: HTMLElement, rows: TrackRow[], tip: VizTooltip, initLang: Lang = 'fr'): Viz11Chart {
  let _lang = initLang;
  const TOP_N  = 40;
  const topSet = new Set(topGenresByMedianPopularity(rows, TOP_N));
  const exploded = explodeByGenre(rows).filter((d) => topSet.has(d.genre));
  let feature: EnergyFeature = 'energy';

  function buildData(feat: EnergyFeature, lang: Lang): GenreBar[] {
    const cfg = L(lang).features.find((f) => f.key === feat)!;
    void cfg; // lang-aware build
    const groups = d3.group(exploded, (d) => d.genre);
    return [...groups.entries()]
      .map(([genre, tracks]) => {
        const vals = tracks.map((d) => Number(d[feat])).filter(Number.isFinite);
        if (!vals.length) return null;
        const sorted = vals.sort(d3.ascending);
        return {
          genre,
          value: d3.mean(sorted)!,
          count: vals.length,
          q1: d3.quantile(sorted, 0.25)!,
          q3: d3.quantile(sorted, 0.75)!,
        };
      })
      .filter((d): d is GenreBar => d !== null)
      .sort((a, b) => d3.descending(a.value, b.value));
  }

  function render() {
    container.innerHTML = '';
    const lbl = L(_lang);
    const cfg = lbl.features.find((f) => f.key === feature)!;
    const data = buildData(feature, _lang);

    const width  = Math.max(640, container.clientWidth || 900);
    const height = Math.max(500, data.length * 16 + 120);
    const margin = { top: 56, right: 56, bottom: 40, left: 148 };
    const iW     = width - margin.left - margin.right;
    const iH     = height - margin.top - margin.bottom;

    const topVal = cfg.domain[1];
    const x = d3.scaleLinear().domain([cfg.domain[0], topVal]).range([0, iW]);
    const y = d3.scaleBand().domain(data.map((d) => d.genre)).range([0, iH]).padding(0.24);

    // Color by value: green (high) → blue (mid) → purple (low) for energy-like metrics
    const colorScale = d3.scaleSequential(
      feature === 'loudness' ? d3.interpolateRdYlGn : d3.interpolateRdYlGn
    ).domain(cfg.domain);

    const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);
    const g   = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    svg.append('text')
      .attr('x', margin.left).attr('y', 24)
      .attr('fill', CHART.text).attr('font-size', 15).attr('font-weight', 700)
      .text(lbl.title(cfg.label, TOP_N));
    svg.append('text')
      .attr('x', margin.left).attr('y', 44)
      .attr('fill', CHART.muted).attr('font-size', 11)
      .text(lbl.hint);

    // vertical reference grid
    g.append('g').attr('class', 'grid')
      .call(
        d3.axisBottom(x).tickSize(iH).tickFormat(() => '').ticks(6) as never
      )
      .attr('transform', 'translate(0,0)')
      .call((sel) => sel.select('.domain').remove())
      .selectAll('line')
      .attr('stroke', CHART.grid).attr('opacity', 0.4);

    const xAx = g.append('g').attr('class', 'axis').attr('transform', `translate(0,${iH})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat((d) => `${d}${cfg.unit}`));
    styleAxis(xAx as never);

    const yAx = g.append('g').attr('class', 'axis').call(d3.axisLeft(y).tickSizeOuter(0));
    styleAxis(yAx as never);

    g.append('text').attr('class', 'axis-label')
      .attr('x', iW / 2).attr('y', iH + 32).attr('text-anchor', 'middle').attr('fill', CHART.secondary)
      .text(cfg.label);

    const rows2 = g.selectAll('.genre-row').data(data).join('g')
      .attr('class', 'genre-row')
      .attr('transform', (d) => `translate(0,${y(d.genre)})`);

    // IQR line
    rows2.append('line')
      .attr('x1', (d) => x(d.q1)).attr('x2', (d) => x(d.q3))
      .attr('y1', y.bandwidth() / 2).attr('y2', y.bandwidth() / 2)
      .attr('stroke', (d) => colorScale(d.value) as string).attr('stroke-width', 1.5)
      .attr('opacity', 0.5);

    const barX0 = x(cfg.domain[0]);

    // Bar
    rows2.append('rect')
      .attr('x', (d) => Math.min(barX0, x(d.value)))
      .attr('y', y.bandwidth() * 0.2)
      .attr('width', (d) => Math.abs(x(d.value) - barX0))
      .attr('height', y.bandwidth() * 0.6)
      .attr('fill', (d) => colorScale(d.value) as string)
      .attr('rx', 3)
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 0.8);
        tip.show(event,
          `<div><strong>${d.genre}</strong></div>
           <div>${cfg.label} ${lbl.tip.avg} : <span class="tooltip-value">${d3.format('.3f')(d.value)}${cfg.unit}</span></div>
           <div>Q1 : ${d3.format('.3f')(d.q1)}${cfg.unit} &nbsp;|&nbsp; Q3 : ${d3.format('.3f')(d.q3)}${cfg.unit}</div>
           <div>${d3.format(',')(d.count)} ${lbl.tip.tracks}</div>`);
      })
      .on('mousemove', (event) => tip.move(event))
      .on('mouseout', function () { d3.select(this).attr('opacity', 1); tip.hide(); });

    // Value label
    rows2.append('text')
      .attr('x', (d) => x(d.value) + 5)
      .attr('y', y.bandwidth() / 2 + 4)
      .attr('font-size', 9.5).attr('fill', CHART.muted)
      .text((d) => `${d3.format('.2f')(d.value)}${cfg.unit}`);
  }

  render();
  return {
    setFeature(f) { feature = f; render(); },
    setLang(l) { _lang = l; render(); },
    resize: render,
    destroy: () => { container.innerHTML = ''; },
  };
}
