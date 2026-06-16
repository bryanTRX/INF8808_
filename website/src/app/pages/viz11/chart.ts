import * as d3 from 'd3';
import type { Lang } from '../../core/services/lang.service';
import { TrackRow } from '../../core/models/track-row';
import { getChartTheme } from '../../viz-shared/chart-theme';
import { VizTooltip } from '../../viz-shared/utils/tooltip';

export interface ArtistTrack {
  trackId: string;
  trackName: string;
  artist: string;
  popularity: number;
  album: string;
  y: number;
}

export interface TrackSearchResult {
  trackId: string;
  trackName: string;
  artist: string;
  popularity: number;
}

const L = (lang: Lang) => lang === 'fr' ? {
  title: (artist: string) => `Popularité du catalogue de ${artist}`,
  hint: 'Chaque point représente un titre. Sa position indique son score de popularité Spotify.',
  axisX: 'Popularité Spotify (0–100)',
  avgLabel: 'Moy. artiste',
  selectedLabel: 'Titre sélectionné',
  tracks: 'titres',
  tip: { pop: 'Popularité', album: 'Album', artist: 'Artiste' },
  noArtist: 'Recherchez un titre pour afficher le catalogue de son artiste.',
} : {
  title: (artist: string) => `Popularity within ${artist}'s catalog`,
  hint: 'Each dot represents one track. Its horizontal position shows the Spotify popularity score.',
  axisX: 'Spotify Popularity (0–100)',
  avgLabel: 'Artist avg.',
  selectedLabel: 'Selected track',
  tracks: 'tracks',
  tip: { pop: 'Popularity', album: 'Album', artist: 'Artist' },
  noArtist: 'Search for a track to display its artist\'s catalog.',
};

function dodge(points: ArtistTrack[], radius: number, x: (p: ArtistTrack) => number): void {
  const sorted = points.slice().sort((a, b) => a.popularity - b.popularity);
  const placed: { cx: number; cy: number }[] = [];
  const r2 = radius * 2;
  sorted.forEach((p) => {
    const cx = x(p);
    let cy = 0;
    let row = 0;
    while (true) {
      const cy1 = row === 0 ? 0 : (row % 2 === 0 ? 1 : -1) * Math.ceil(row / 2) * r2;
      const ok = placed.every(({ cx: ox, cy: oy }) => {
        const dx = cx - ox, dy = cy1 - oy;
        return dx * dx + dy * dy >= r2 * r2;
      });
      if (ok) { cy = cy1; break; }
      row++;
      if (row > 300) { cy = (Math.random() - 0.5) * r2 * 10; break; }
    }
    p.y = cy;
    placed.push({ cx, cy });
  });
}

export interface Viz11Chart {
  setQuery: (artist: string, highlightId: string | null, minPop: number) => void;
  setLang: (l: Lang) => void;
  resize: () => void;
  destroy: () => void;
}

export function buildTrackIndex(rows: TrackRow[]): TrackSearchResult[] {
  const seen = new Set<string>();
  return rows
    .map((r): TrackSearchResult | null => {
      const id = String(r.track_id || '');
      const name = String(r.track_name || '').trim();
      const artist = String(r.artists || '').split(';')[0].trim();
      const pop = Number(r.popularity);
      if (!name || !artist || !Number.isFinite(pop) || seen.has(id)) return null;
      seen.add(id);
      return { trackId: id, trackName: name, artist, popularity: pop };
    })
    .filter((d): d is TrackSearchResult => d !== null);
}

export function createViz11Chart(
  container: HTMLElement,
  rows: TrackRow[],
  tip: VizTooltip,
  initLang: Lang = 'fr',
): Viz11Chart {
  let _lang = initLang;

  // Pre-group tracks by primary artist (lowercase key)
  const artistMap = new Map<string, ArtistTrack[]>();
  rows.forEach((r) => {
    const pop = Number(r.popularity);
    if (!Number.isFinite(pop)) return;
    const artist = String(r.artists || '').split(';')[0].trim();
    if (!artist) return;
    const key = artist.toLowerCase();
    if (!artistMap.has(key)) artistMap.set(key, []);
    artistMap.get(key)!.push({
      trackId: String(r.track_id || ''),
      trackName: String(r.track_name || '').trim(),
      artist,
      popularity: pop,
      album: String(r.album_name || ''),
      y: 0,
    });
  });

  let currentArtist = '';
  let currentHighlight: string | null = null;
  let currentMinPop = 0;

  function render() {
    container.innerHTML = '';
    const lbl = L(_lang);
    const theme = getChartTheme();

    if (!currentArtist) {
      d3.select(container).append('p')
        .style('color', 'var(--muted)').style('font-size', '0.9rem')
        .style('text-align', 'center').style('margin-top', '3rem')
        .text(lbl.noArtist);
      return;
    }

    const key = currentArtist.toLowerCase();
    const all = artistMap.get(key) ?? [];
    const pts = all.filter((d) => d.popularity >= currentMinPop);
    if (!pts.length) return;

    const width = Math.max(500, container.getBoundingClientRect().width || container.clientWidth || 700);
    const radius = 5;
    const margin = { top: 56, right: 24, bottom: 52, left: 56 };
    const iW = width - margin.left - margin.right;

    const x = d3.scaleLinear().domain([0, 100]).range([0, iW]);
    dodge(pts, radius, (d) => x(d.popularity));

    const yExt = d3.extent(pts, (d) => d.y) as [number, number];
    const bandH = Math.abs(yExt[0]) + Math.abs(yExt[1]) + radius * 6;
    const height = margin.top + bandH + margin.bottom;
    const midY = margin.top + Math.abs(yExt[0]) + radius * 3;

    const avgPop = d3.mean(pts, (d) => d.popularity) ?? 0;
    const highlighted = pts.find((d) => d.trackId === currentHighlight) ?? null;

    const svg = d3.select(container).append('svg')
      .attr('width', width).attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${midY})`);

    // Title
    svg.append('text').attr('class', 'chart-title')
      .attr('x', margin.left).attr('y', 22)
      .text(lbl.title(currentArtist));

    svg.append('text').attr('class', 'chart-subtitle')
      .attr('x', margin.left).attr('y', 40)
      .attr('font-size', 11)
      .text(`${pts.length} ${lbl.tracks}`);

    // Grid
    g.append('g').attr('class', 'grid')
      .call(d3.axisBottom(x).ticks(10).tickSize(-(bandH + radius * 2)).tickFormat(() => ''))
      .attr('transform', `translate(0,${bandH / 2})`)
      .call((s) => { s.select('.domain').remove(); s.selectAll('line').attr('stroke', theme.border).attr('stroke-opacity', 0.3); });

    // Average reference line
    g.append('line')
      .attr('x1', x(avgPop)).attr('x2', x(avgPop))
      .attr('y1', -bandH / 2 - radius).attr('y2', bandH / 2 + radius)
      .attr('stroke', theme.muted).attr('stroke-dasharray', '5,4').attr('stroke-width', 1.5);
    g.append('text').attr('class', 'axis-label')
      .attr('x', x(avgPop) + 4).attr('y', -bandH / 2 - radius - 4)
      .style('font-size', '10px').style('font-weight', '600')
      .text(`${lbl.avgLabel} ${avgPop.toFixed(1)}`);

    // Dots — non-highlighted first, then highlighted on top
    const nonHighlighted = pts.filter((d) => d.trackId !== currentHighlight);
    const hl = pts.filter((d) => d.trackId === currentHighlight);

    const renderDots = (data: ArtistTrack[], isHl: boolean) => {
      g.selectAll(isHl ? '.bee-hl' : '.bee')
        .data(data, (d) => (d as ArtistTrack).trackId)
        .join('circle')
        .attr('class', isHl ? 'bee-hl' : 'bee')
        .attr('cx', (d) => x(d.popularity))
        .attr('cy', (d) => d.y)
        .attr('r', isHl ? radius + 2 : radius)
        .attr('fill', isHl ? 'var(--accent)' : theme.bar)
        .attr('stroke', isHl ? '#fff' : 'none')
        .attr('stroke-width', isHl ? 2 : 0)
        .attr('opacity', isHl ? 1 : 0.55)
        .on('mouseover', (event, d) => {
          d3.select(event.currentTarget as SVGCircleElement).attr('opacity', 1).attr('r', radius + 2);
          tip.show(event,
            `<div style="margin-bottom:0.35rem"><strong style="font-size:0.9rem">${d.trackName}</strong></div>
            <div style="color:var(--muted);font-size:0.78rem;margin-bottom:0.4rem">${d.artist}</div>
            <div style="border-top:1px solid var(--border);padding-top:0.4rem;font-size:0.82rem">
              <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
                <span style="color:var(--muted)">${lbl.tip.pop}</span>
                <span class="tooltip-value">${d.popularity}</span>
              </div>
              ${d.album ? `<div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
                <span style="color:var(--muted)">${lbl.tip.album}</span>
                <span style="color:var(--text)">${d.album}</span>
              </div>` : ''}
            </div>`);
        })
        .on('mousemove', (event) => tip.move(event))
        .on('mouseout', (event, d) => {
          const isHighlighted = d.trackId === currentHighlight;
          d3.select(event.currentTarget as SVGCircleElement)
            .attr('opacity', isHighlighted ? 1 : 0.55)
            .attr('r', isHighlighted ? radius + 2 : radius);
          tip.hide();
        });
    };

    renderDots(nonHighlighted, false);
    renderDots(hl, true);

    // Highlighted label
    if (highlighted) {
      g.append('text')
        .attr('x', x(highlighted.popularity))
        .attr('y', highlighted.y - radius - 6)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--accent)')
        .style('font-size', '9px').style('font-weight', '700')
        .text(highlighted.trackName.length > 20 ? highlighted.trackName.slice(0, 19) + '…' : highlighted.trackName);
    }

    // X axis
    const xAx = g.append('g').attr('class', 'axis')
      .attr('transform', `translate(0,${bandH / 2 + radius + 4})`)
      .call(d3.axisBottom(x).ticks(10));
    xAx.select('.domain').attr('stroke', theme.border);
    xAx.selectAll('text').attr('fill', theme.muted);

    g.append('text').attr('class', 'axis-label')
      .attr('x', iW / 2).attr('y', bandH / 2 + radius + 40)
      .attr('text-anchor', 'middle').text(lbl.axisX);

    // Legend
    const legG = svg.append('g').attr('transform', `translate(${width - 160},${margin.top - 10})`);
    [[theme.bar, 0.55, radius, lbl.tracks], ['var(--accent)', 1, radius + 2, lbl.selectedLabel]].forEach(([color, op, r, label], i) => {
      const row = legG.append('g').attr('transform', `translate(0,${i * 18})`);
      row.append('circle').attr('r', r as number).attr('cx', 6).attr('cy', 6)
        .attr('fill', color as string).attr('opacity', op as number);
      row.append('text').attr('x', 16).attr('y', 10).attr('font-size', 10)
        .attr('fill', theme.text).text(label as string);
    });
  }

  render();
  return {
    setQuery(artist, highlightId, minPop) {
      currentArtist = artist;
      currentHighlight = highlightId;
      currentMinPop = minPop;
      render();
    },
    setLang(l) { _lang = l; render(); },
    resize: render,
    destroy: () => { container.innerHTML = ''; },
  };
}
