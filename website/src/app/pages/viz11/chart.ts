import * as d3 from 'd3';
import { TrackRow } from '../../core/models/track-row';
import { getChartTheme } from '../../viz-shared/chart-theme';
import { VizTooltip } from '../../viz-shared/utils/tooltip';

// ─── Labels ───────────────────────────────────────────────────────────────────

const LBL = {
  title: 'Similar Tracks Similarity Map',
  subtitle: 'Showing the audio-feature neighbourhood of the selected track',
  xLabel: 'Dimension 1 (PCA)',
  yLabel: 'Dimension 2 (PCA)',
  tipArtist: 'Artist',
  tipPop: 'Popularity',
  tipSimilarity: 'Similarity',
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrackSearchResult {
  trackId: string;
  title: string;
  artist: string;
  popularity: number;
}

export interface Viz11Chart {
  setQuery: (artist: string, trackId: string, minPop: number) => void;
  resize: () => void;
  destroy: () => void;
}

// ─── Feature Extraction ───────────────────────────────────────────────────────

const SIM_FEATURES = [
  'danceability', 'energy', 'acousticness', 'valence',
  'speechiness', 'instrumentalness',
] as const;

type SimFeature = (typeof SIM_FEATURES)[number];

interface TrackVec {
  trackId: string;
  title: string;
  artist: string;
  popularity: number;
  features: number[];
}

function norm(v: number[]): number[] {
  const mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return mag === 0 ? v : v.map((x) => x / mag);
}

function cosineSim(a: number[], b: number[]): number {
  return a.reduce((s, x, i) => s + x * b[i], 0);
}

export function buildTrackIndex(rows: TrackRow[]): TrackSearchResult[] {
  const seen = new Set<string>();
  return rows.map((r) => {
    const id = String(r.track_id || '');
    if (!id || seen.has(id)) return null;
    seen.add(id);
    return {
      trackId: id,
      title: String(r.track_name || ''),
      artist: String(r.artists || ''),
      popularity: Number(r.popularity) || 0,
    };
  }).filter((t): t is TrackSearchResult => t !== null);
}

// ─── Simple 2D PCA (Oja / power iteration) ───────────────────────────────────

function pca2d(vectors: number[][]): Array<[number, number]> {
  const n = vectors.length;
  const d = vectors[0].length;

  const mean = new Array<number>(d).fill(0);
  vectors.forEach((v) => v.forEach((x, j) => { mean[j] += x / n; }));
  const centered = vectors.map((v) => v.map((x, j) => x - mean[j]));

  function powerIter(vecs: number[][], prevDir?: number[]): number[] {
    let u = prevDir ?? vecs[0].slice();
    for (let iter = 0; iter < 80; iter++) {
      const next = new Array<number>(d).fill(0);
      vecs.forEach((v) => {
        const proj = v.reduce((s, x, j) => s + x * u[j], 0);
        v.forEach((x, j) => { next[j] += proj * x; });
      });
      const mag = Math.sqrt(next.reduce((s, x) => s + x * x, 0));
      u = mag === 0 ? next : next.map((x) => x / mag);
    }
    return u;
  }

  const pc1 = powerIter(centered);
  const deflated = centered.map((v) => {
    const proj = v.reduce((s, x, j) => s + x * pc1[j], 0);
    return v.map((x, j) => x - proj * pc1[j]);
  });
  const pc2 = powerIter(deflated, pc1.slice().reverse());

  return centered.map((v) => [
    v.reduce((s, x, j) => s + x * pc1[j], 0),
    v.reduce((s, x, j) => s + x * pc2[j], 0),
  ]);
}

// ─── Chart Factory ────────────────────────────────────────────────────────────

export function createViz11Chart(container: HTMLElement, rows: TrackRow[], tip: VizTooltip): Viz11Chart {
  // Build track vectors
  const trackVecs = new Map<string, TrackVec>();
  rows.forEach((r) => {
    const id = String(r.track_id || '');
    if (!id || trackVecs.has(id)) return;
    const features = SIM_FEATURES.map((f) => {
      const v = Number(r[f as keyof TrackRow]);
      return Number.isFinite(v) ? v : 0;
    });
    trackVecs.set(id, {
      trackId: id,
      title: String(r.track_name || ''),
      artist: String(r.artists || ''),
      popularity: Number(r.popularity) || 0,
      features,
    });
  });

  const allVecs = [...trackVecs.values()];

  let currentArtist = '';
  let currentTrackId = '';
  let currentMinPop = 0;

  function getNeighbours(targetId: string, minPop: number, k = 60): { vec: TrackVec; sim: number }[] {
    const target = trackVecs.get(targetId);
    if (!target) return [];
    const normTarget = norm(target.features);
    return allVecs
      .filter((v) => v.trackId !== targetId && v.popularity >= minPop)
      .map((v) => ({ vec: v, sim: cosineSim(normTarget, norm(v.features)) }))
      .sort((a, b) => d3.descending(a.sim, b.sim))
      .slice(0, k);
  }

  function renderChart() {
    container.innerHTML = '';
    const theme = getChartTheme();

    const target = trackVecs.get(currentTrackId);
    if (!target) {
      container.innerHTML = `<div class="chart-loading" style="text-align:center;color:var(--muted)">Pick an artist and track to explore</div>`;
      return;
    }

    const neighbours = getNeighbours(currentTrackId, currentMinPop);
    const artistTracks = allVecs.filter(
      (v) => v.artist.toLowerCase() === currentArtist.toLowerCase() &&
        v.trackId !== currentTrackId && v.popularity >= currentMinPop,
    ).slice(0, 20);

    const allPoints = [target, ...neighbours.map((n) => n.pc = undefined as never || n.vec), ...artistTracks];
    const simMap = new Map(neighbours.map((n) => [n.vec.trackId, n.sim]));
    const artistSet = new Set(artistTracks.map((t) => t.trackId));

    const allFeatures = allPoints.map((v) => v.features);
    const coords = pca2d(allFeatures);

    const margin = { top: 52, right: 20, bottom: 56, left: 52 };
    const W = Math.max(480, container.clientWidth || 700);
    const H = Math.max(400, container.clientHeight || 520);
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top - margin.bottom;

    const xExt = d3.extent(coords, ([x]) => x) as [number, number];
    const yExt = d3.extent(coords, ([, y]) => y) as [number, number];
    const pad = 0.15;
    const xRange = xExt[1] - xExt[0];
    const yRange = yExt[1] - yExt[0];

    const x = d3.scaleLinear()
      .domain([xExt[0] - xRange * pad, xExt[1] + xRange * pad])
      .range([0, innerW]);
    const y = d3.scaleLinear()
      .domain([yExt[0] - yRange * pad, yExt[1] + yRange * pad])
      .range([innerH, 0]);

    const svg = d3.select(container).append('svg')
      .attr('width', W).attr('height', H).attr('viewBox', `0 0 ${W} ${H}`);

    svg.append('text').attr('class', 'chart-title')
      .attr('x', W / 2).attr('y', 24).attr('text-anchor', 'middle')
      .text(LBL.title);
    svg.append('text').attr('class', 'chart-subtitle')
      .attr('x', W / 2).attr('y', 40).attr('text-anchor', 'middle')
      .text(LBL.subtitle);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(4).tickFormat(() => ''));
    g.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(4).tickFormat(() => ''));
    g.append('text').attr('class', 'axis-label').attr('x', innerW / 2).attr('y', innerH + 38).attr('text-anchor', 'middle').text(LBL.xLabel);
    g.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -38).attr('text-anchor', 'middle').text(LBL.yLabel);

    const simColorScale = d3.scaleSequential().domain([0.7, 1]).interpolator(d3.interpolateBlues);

    allPoints.forEach((vec, i) => {
      const [cx, cy2] = coords[i];
      const isTarget = vec.trackId === target.trackId;
      const isArtist = artistSet.has(vec.trackId);
      const sim = simMap.get(vec.trackId);

      const color = isTarget ? '#ef4444' : isArtist ? '#f59e0b' : sim != null ? simColorScale(sim) : '#6b7280';
      const r = isTarget ? 8 : isArtist ? 5.5 : 4;

      const circle = g.append('circle')
        .attr('cx', x(cx)).attr('cy', y(cy2))
        .attr('r', r).attr('fill', color).attr('opacity', isTarget ? 1 : 0.72)
        .attr('stroke', isTarget ? '#fff' : 'none').attr('stroke-width', isTarget ? 2 : 0);

      circle.on('mouseover', function (event) {
        circle.attr('opacity', 1).attr('r', r + 2);
        tip.show(event, `
          <strong style="font-size:0.9rem">${vec.title}</strong>
          <div style="border-top:1px solid var(--border);margin-top:0.4rem;padding-top:0.4rem;font-size:0.82rem">
            <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
              <span style="color:var(--muted)">${LBL.tipArtist}</span>
              <span class="tooltip-value">${vec.artist}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
              <span style="color:var(--muted)">${LBL.tipPop}</span>
              <span class="tooltip-value">${vec.popularity}</span>
            </div>
            ${sim != null ? `<div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
              <span style="color:var(--muted)">${LBL.tipSimilarity}</span>
              <span class="tooltip-value">${(sim * 100).toFixed(1)}%</span>
            </div>` : ''}
          </div>`);
      })
      .on('mousemove', (event) => tip.move(event))
      .on('mouseout', function () { circle.attr('opacity', isTarget ? 1 : 0.72).attr('r', r); tip.hide(); });
    });

    // Legend
    const legData = [
      { color: '#ef4444', label: 'Selected track' },
      { color: '#f59e0b', label: `Other tracks by artist` },
      { color: simColorScale(0.85), label: 'Similar track' },
    ];
    const legG = g.append('g').attr('transform', `translate(${innerW - 160}, 4)`);
    legData.forEach(({ color, label }, i) => {
      const row = legG.append('g').attr('transform', `translate(0,${i * 18})`);
      row.append('circle').attr('cx', 6).attr('cy', 0).attr('r', 5).attr('fill', color).attr('opacity', 0.85);
      row.append('text').attr('x', 14).attr('y', 4).attr('class', 'legend-label').style('font-size', '10.5px').text(label);
    });
  }

  renderChart();

  return {
    setQuery: (artist, trackId, minPop) => {
      currentArtist = artist;
      currentTrackId = trackId;
      currentMinPop = minPop;
      renderChart();
    },
    resize: renderChart,
    destroy: () => { container.innerHTML = ''; },
  };
}
