import * as d3 from 'd3';
import { TrackRow } from '../../core/models/track-row';
import { filterTopGenres } from '../../viz-shared/utils/data-helpers';
import { VizTooltip } from '../../viz-shared/utils/tooltip';
import type { Lang } from '../../core/services/lang.service';

const TIERS = ['0-19', '20-39', '40-59', '60-79', '80-100'] as const;
type Tier = (typeof TIERS)[number];
export type FeatureKey = 'valence' | 'instrumentalness' | 'speechiness' | 'danceability' | 'energy';

interface CategoryDef {
  key: string;
  label: string;
  color: string;
  desc: string;
  classify: (v: number) => boolean;
}

type FeatureConfig = Record<FeatureKey, { title: string; categories: CategoryDef[] }>;

const FEATURE_CONFIG_EN: FeatureConfig = {
  valence: {
    title: 'Valence Breakdown Across Popularity Tiers',
    categories: [
      { key: 'low', label: 'Sad/Angry (Low)', color: '#f4a582', desc: 'Score below 0.33 — conveys sadness, tension or negative emotion.', classify: (v) => v <= 0.33 },
      { key: 'mid', label: 'Neutral (Medium)', color: '#d6604d', desc: 'Score between 0.33 and 0.66 — mixed or ambiguous emotional tone.', classify: (v) => v > 0.33 && v <= 0.66 },
      { key: 'high', label: 'Happy/Upbeat (High)', color: '#8b1a0e', desc: 'Score above 0.66 — conveys joy, euphoria or positivity.', classify: (v) => v > 0.66 },
    ],
  },
  instrumentalness: {
    title: 'Instrumentalness Breakdown Across Popularity Tiers',
    categories: [
      { key: 'vocal', label: 'Mostly Vocal', color: '#f4a582', desc: 'Score below 0.1 — track is dominated by singing or speech.', classify: (v) => v <= 0.1 },
      { key: 'mixed', label: 'Mixed', color: '#d6604d', desc: 'Score between 0.1 and 0.8 — blend of vocals and instruments.', classify: (v) => v > 0.1 && v <= 0.8 },
      { key: 'inst', label: 'Instrumental', color: '#8b1a0e', desc: 'Score above 0.8 — little to no vocal content.', classify: (v) => v > 0.8 },
    ],
  },
  speechiness: {
    title: 'Speechiness Breakdown Across Popularity Tiers',
    categories: [
      { key: 'low', label: 'Low Speech', color: '#f4a582', desc: 'Score below 0.33 — primarily music with few spoken words.', classify: (v) => v <= 0.33 },
      { key: 'mid', label: 'Medium Speech', color: '#d6604d', desc: 'Score between 0.33 and 0.66 — may include rap or narrative content.', classify: (v) => v > 0.33 && v <= 0.66 },
      { key: 'high', label: 'High Speech', color: '#8b1a0e', desc: 'Score above 0.66 — heavily spoken or rap-heavy content.', classify: (v) => v > 0.66 },
    ],
  },
  danceability: {
    title: 'Danceability Breakdown Across Popularity Tiers',
    categories: [
      { key: 'low', label: 'Low Dance', color: '#f4a582', desc: 'Score below 0.33 — not well-suited for dancing.', classify: (v) => v <= 0.33 },
      { key: 'mid', label: 'Medium Dance', color: '#d6604d', desc: 'Score between 0.33 and 0.66 — moderately rhythmic and groove-able.', classify: (v) => v > 0.33 && v <= 0.66 },
      { key: 'high', label: 'High Dance', color: '#8b1a0e', desc: 'Score above 0.66 — highly rhythmic and dance-friendly.', classify: (v) => v > 0.66 },
    ],
  },
  energy: {
    title: 'Energy Breakdown Across Popularity Tiers',
    categories: [
      { key: 'low', label: 'Low Energy', color: '#f4a582', desc: 'Score below 0.33 — calm, soft or acoustic feel.', classify: (v) => v <= 0.33 },
      { key: 'mid', label: 'Medium Energy', color: '#d6604d', desc: 'Score between 0.33 and 0.66 — moderate intensity and drive.', classify: (v) => v > 0.33 && v <= 0.66 },
      { key: 'high', label: 'High Energy', color: '#8b1a0e', desc: 'Score above 0.66 — loud, fast and intense.', classify: (v) => v > 0.66 },
    ],
  },
};

export const FEATURE_LABELS_EN: Record<FeatureKey, string> = {
  valence: 'Valence', instrumentalness: 'Instrumentalness',
  speechiness: 'Speechiness', danceability: 'Danceability', energy: 'Energy',
};

const L = (_lang: Lang) => ({
  config: FEATURE_CONFIG_EN,
  labels: FEATURE_LABELS_EN,
  axisY: 'Percentage of Tracks (%)',
  axisX: 'Popularity Tier',
  titlePrefix: '',
  tipTracks: 'Tracks',
});

export function getFeatureLabels(_lang: Lang) { return FEATURE_LABELS_EN; }

function popularityTier(pop: number): Tier {
  if (pop <= 19) return '0-19';
  if (pop <= 39) return '20-39';
  if (pop <= 59) return '40-59';
  if (pop <= 79) return '60-79';
  return '80-100';
}

interface TierRow {
  tier: Tier;
  total: number;
  [key: string]: number | string;
}

interface TierBucket {
  total: number;
  [key: string]: number;
}

export interface Viz08Chart {
  setFeature: (feature: FeatureKey) => void;
  setLang: (lang: Lang) => void;
  resize: () => void;
  destroy: () => void;
}

export function createViz08Chart(container: HTMLElement, rows: TrackRow[], tip: VizTooltip, initLang: Lang = 'fr'): Viz08Chart {
  const filtered = filterTopGenres(rows, 50);
  let feature: FeatureKey = 'valence';
  let _lang: Lang = initLang;

  function buildData(feat: FeatureKey): TierRow[] {
    const config = L(_lang).config[feat];
    const keys = config.categories.map((c) => c.key);
    const tierMap = new Map<Tier, TierBucket>();

    TIERS.forEach((t) => {
      const init: TierBucket = { total: 0 };
      keys.forEach((k) => { init[k] = 0; });
      tierMap.set(t, init);
    });

    filtered.forEach((row) => {
      const pop = Number(row.popularity);
      const val = Number(row[feat]);
      if (!Number.isFinite(pop) || !Number.isFinite(val)) return;
      const tier = popularityTier(pop);
      const bucket = tierMap.get(tier)!;
      bucket.total += 1;
      const cat = config.categories.find((c) => c.classify(val));
      if (cat) bucket[cat.key] += 1;
    });

    return TIERS.map((tier) => {
      const bucket = tierMap.get(tier)!;
      const total = bucket.total || 1;
      const row: TierRow = { tier, total: bucket.total };
      keys.forEach((k) => { row[k] = (bucket[k] / total) * 100; });
      return row;
    });
  }

  function render() {
    container.innerHTML = '';
    const lbl = L(_lang);
    const config = lbl.config[feature];
    const keys = config.categories.map((c) => c.key);
    const data = buildData(feature);

    const width = Math.max(640, container.clientWidth || 900);
    const height = Math.max(420, container.clientHeight || 480);
    const margin = { top: 48, right: 175, bottom: 48, left: 56 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scaleBand().domain([...TIERS]).range([0, innerWidth]).padding(0.2);
    const y = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);
    const stack = d3.stack<TierRow>().keys(keys).order(d3.stackOrderNone).offset(d3.stackOffsetNone);
    const stacked = stack(data);

    const svg = d3.select(container).append('svg').attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    g.append('text').attr('class', 'chart-title').attr('y', -24)
      .text(`${lbl.titlePrefix} ${config.title}`);

    g.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(6).tickFormat((d) => `${d}%`));
    g.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2).attr('y', -42).attr('text-anchor', 'middle').text(lbl.axisY);

    g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(x));
    g.append('text').attr('class', 'axis-label').attr('x', innerWidth / 2)
      .attr('y', innerHeight + 36).attr('text-anchor', 'middle').text(lbl.axisX);

    g.selectAll('.bar-group').data(stacked).join('g')
      .attr('fill', (s) => config.categories.find((c) => c.key === s.key)?.color || '#999')
      .selectAll('rect').data((s) => s).join('rect')
      .attr('x', (d) => x(d.data.tier as string)!)
      .attr('y', (d) => y(d[1]))
      .attr('width', x.bandwidth())
      .attr('height', (d) => Math.max(0, y(d[0]) - y(d[1])))
      .on('mouseover', (event, d) => {
        const el = event.currentTarget as SVGRectElement;
        const series = d3.select(el.parentElement!).datum() as d3.Series<TierRow, string>;
        const cat = config.categories.find((c) => c.key === series.key)!;
        const pct = (d[1] - d[0]);
        tip.show(event, `<div><strong>${d.data.tier}</strong></div>
          <div>${cat.label}: <span class="tooltip-value">${d3.format('.1f')(pct)}%</span></div>
          <div>${lbl.tipTracks}: ${d3.format(',')(d.data.total)}</div>`);
      })
      .on('mousemove', (event) => tip.move(event))
      .on('mouseout', () => tip.hide());

    const legend = svg.append('g').attr('transform', `translate(${width - margin.right + 8},${margin.top})`);
    config.categories.forEach((cat, i) => {
      const row = legend.append('g').attr('transform', `translate(0,${i * 22})`).style('cursor', 'default');
      // Transparent hit area
      row.append('rect').attr('width', margin.right - 12).attr('height', 20).attr('y', -3).attr('fill', 'transparent');
      row.append('rect').attr('width', 14).attr('height', 14).attr('fill', cat.color);
      row.append('text').attr('class', 'legend-label').attr('x', 20).attr('y', 11).attr('font-size', 11).text(cat.label);
      row.on('mouseover', (event) => {
        tip.show(event,
          `<div style="margin-bottom:0.3rem;display:flex;align-items:center;gap:0.5rem">
            <span style="width:10px;height:10px;border-radius:2px;background:${cat.color};display:inline-block;flex-shrink:0"></span>
            <strong>${cat.label}</strong>
          </div>
          <div style="font-size:0.82rem;color:var(--text-secondary);max-width:220px;line-height:1.5">${cat.desc}</div>`);
      })
      .on('mousemove', (event) => tip.move(event))
      .on('mouseout', () => tip.hide());
    });
  }

  render();
  return {
    setFeature(f) { feature = f; render(); },
    setLang(l) { _lang = l; render(); },
    resize: render,
    destroy: () => { container.innerHTML = ''; },
  };
}

export const FEATURE_KEYS: FeatureKey[] = ['valence', 'instrumentalness', 'speechiness', 'danceability', 'energy'];
