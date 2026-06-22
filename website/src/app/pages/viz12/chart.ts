import * as d3 from 'd3';
import { TrackRow } from '../../core/models/track-row';
import { getChartTheme } from '../../viz-shared/chart-theme';
import { VizTooltip } from '../../viz-shared/utils/tooltip';
import { GENRE_FAMILIES, assignGenreFamily } from '../../viz-shared/utils/genre-families';

// ─── Labels ───────────────────────────────────────────────────────────────────

const LBL = {
  title: 'Popularity Beeswarm',
  subtitle: 'Each dot = one track. X = popularity score (0–100).',
  xLabel: 'Popularity',
  groupLabels: {
    none: 'All tracks',
    explicit: 'Explicit',
    genre: 'Genre Family',
  } as Record<BeeGrouping, string>,
  tipArtist: 'Artist',
  tipGenre: 'Genre',
  tipPop: 'Popularity',
  tipExplicit: 'Explicit',
  yes: 'Yes',
  no: 'No',
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type BeeGrouping = 'none' | 'explicit' | 'genre';

export interface Viz12Options {
  groupBy: BeeGrouping;
  sampleSize: number;
  search: string;
}

export interface Viz12Chart {
  resize: () => void;
  destroy: () => void;
  update: (opts: Partial<Viz12Options>) => void;
}

// ─── Beeswarm Layout ──────────────────────────────────────────────────────────

interface BeePoint {
  x: number;
  y: number;
  pop: number;
  title: string;
  artist: string;
  genre: string;
  explicit: boolean;
  group: string;
  color: string;
  highlight: boolean;
}

function beeswarm(
  data: { pop: number; [k: string]: unknown }[],
  xScale: d3.ScaleLinear<number, number>,
  R: number,
  bandwidth: number,
): BeePoint[] {
  const sorted = [...data].sort((a, b) => d3.ascending(a.pop, b.pop));
  const placed: { cx: number; cy: number; r: number }[] = [];
  return sorted.map((d) => {
    const cx = xScale(d.pop);
    let cy = bandwidth / 2;
    let placed2 = false;
    for (let step = 0; step <= bandwidth; step += R * 0.9) {
      for (const sign of [1, -1]) {
        const tryY = bandwidth / 2 + sign * step;
        let ok = true;
        for (const p of placed) {
          const dx = cx - p.cx, dy = tryY - p.cy;
          if (Math.sqrt(dx * dx + dy * dy) < R * 1.8) { ok = false; break; }
        }
        if (ok) {
          placed.push({ cx, cy: tryY, r: R });
          cy = tryY;
          placed2 = true;
          break;
        }
      }
      if (placed2) break;
    }
    if (!placed2) placed.push({ cx, cy, r: R });
    return { ...d, x: cx, y: cy } as BeePoint;
  });
}

// ─── Chart Factory ────────────────────────────────────────────────────────────

export function createViz12Chart(container: HTMLElement, rows: TrackRow[], tip: VizTooltip): Viz12Chart {
  let opts: Viz12Options = { groupBy: 'none', sampleSize: 3000, search: '' };

  const prepped: Array<{
    pop: number; title: string; artist: string; genre: string;
    explicit: boolean; famKey: string; famColor: string;
  }> = rows.map((r) => {
    const genre = String(r.track_genre || '').trim();
    const fam = assignGenreFamily(genre.split(';')[0].trim());
    return {
      pop: Number(r.popularity) || 0,
      title: String(r.track_name || ''),
      artist: String(r.artists || ''),
      genre,
      explicit: String(r.explicit).toLowerCase() === 'true',
      famKey: fam?.key ?? 'other',
      famColor: fam?.color ?? '#888',
    };
  }).filter((d) => d.pop >= 0);

  function getGroups(): Array<{ key: string; label: string; tracks: typeof prepped; color: string }> {
    const sample = (arr: typeof prepped) => {
      if (arr.length <= opts.sampleSize) return arr;
      const step = arr.length / opts.sampleSize;
      return Array.from({ length: opts.sampleSize }, (_, i) => arr[Math.floor(i * step)]);
    };

    const searchFilter = opts.search
      ? (d: (typeof prepped)[0]) =>
          d.title.toLowerCase().includes(opts.search.toLowerCase()) ||
          d.artist.toLowerCase().includes(opts.search.toLowerCase())
      : () => true;

    if (opts.groupBy === 'none') {
      return [{ key: 'all', label: LBL.groupLabels.none, tracks: sample(prepped.filter(searchFilter)), color: '#4C78A8' }];
    }
    if (opts.groupBy === 'explicit') {
      const exp = prepped.filter((d) => d.explicit).filter(searchFilter);
      const clean = prepped.filter((d) => !d.explicit).filter(searchFilter);
      return [
        { key: 'explicit', label: LBL.groupLabels.explicit, tracks: sample(exp), color: '#E45756' },
        { key: 'clean', label: 'Clean', tracks: sample(clean), color: '#4C78A8' },
      ];
    }
    // genre
    return GENRE_FAMILIES.map((fam) => {
      const tracks = prepped.filter((d) => d.famKey === fam.key).filter(searchFilter);
      return { key: fam.key, label: fam.en, tracks: sample(tracks), color: fam.color };
    }).filter((g) => g.tracks.length > 0);
  }

  function render() {
    container.innerHTML = '';
    const theme = getChartTheme();
    const groups = getGroups();
    if (groups.length === 0) return;

    const R = 3;
    const groupH = opts.groupBy === 'none' ? 80 : 55;
    const margin = { top: 54, right: 24, bottom: 60, left: 80 };
    const width  = Math.max(560, container.clientWidth || 900);
    const innerW = width - margin.left - margin.right;
    const totalH = margin.top + groups.length * (groupH + 24) + margin.bottom + 30;

    const x = d3.scaleLinear().domain([0, 100]).range([0, innerW]);

    const svg = d3.select(container).append('svg')
      .attr('width', width).attr('height', totalH)
      .attr('viewBox', `0 0 ${width} ${totalH}`);

    svg.append('text').attr('class', 'chart-title')
      .attr('x', width / 2).attr('y', 22).attr('text-anchor', 'middle')
      .text(LBL.title);
    svg.append('text').attr('class', 'chart-subtitle')
      .attr('x', width / 2).attr('y', 38).attr('text-anchor', 'middle')
      .text(LBL.subtitle);

    groups.forEach((group, gi) => {
      const offsetY = margin.top + gi * (groupH + 24);

      const g = svg.append('g').attr('transform', `translate(${margin.left},${offsetY})`);

      g.append('text').attr('class', 'axis-label')
        .attr('x', -8).attr('y', groupH / 2 + 4)
        .attr('text-anchor', 'end')
        .style('font-size', '11px').style('font-weight', '600')
        .style('fill', group.color)
        .text(group.label);

      const beeData = group.tracks.map((t) => ({
        pop: t.pop,
        title: t.title,
        artist: t.artist,
        genre: t.genre,
        explicit: t.explicit,
        group: group.key,
        color: opts.groupBy === 'genre' ? t.famColor : group.color,
        highlight: false,
      }));

      const swarm = beeswarm(beeData, x, R, groupH);

      g.selectAll<SVGCircleElement, BeePoint>('.bee')
        .data(swarm).join('circle').attr('class', 'bee')
        .attr('cx', (d) => d.x).attr('cy', (d) => d.y)
        .attr('r', R).attr('fill', (d) => d.color).attr('opacity', 0.65)
        .on('mouseover', function (event, d) {
          d3.select(this).attr('opacity', 1).attr('r', R + 2);
          tip.show(event, `
            <strong style="font-size:0.9rem">${d.title}</strong>
            <div style="border-top:1px solid var(--border);margin-top:0.4rem;padding-top:0.4rem;font-size:0.82rem">
              <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
                <span style="color:var(--muted)">${LBL.tipArtist}</span>
                <span class="tooltip-value">${d.artist}</span>
              </div>
              <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
                <span style="color:var(--muted)">${LBL.tipPop}</span>
                <span class="tooltip-value">${d.pop}</span>
              </div>
              <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
                <span style="color:var(--muted)">${LBL.tipExplicit}</span>
                <span class="tooltip-value">${d.explicit ? LBL.yes : LBL.no}</span>
              </div>
              <div style="display:flex;justify-content:space-between;gap:1.5rem;line-height:1.9">
                <span style="color:var(--muted)">${LBL.tipGenre}</span>
                <span class="tooltip-value">${d.genre.split(';')[0]}</span>
              </div>
            </div>`);
        })
        .on('mousemove', (event) => tip.move(event))
        .on('mouseout', function () { d3.select(this).attr('opacity', 0.65).attr('r', R); tip.hide(); });

      if (gi === groups.length - 1) {
        g.append('g').attr('class', 'axis').attr('transform', `translate(0,${groupH + 8})`)
          .call(d3.axisBottom(x).ticks(8));
        g.append('text').attr('class', 'axis-label')
          .attr('x', innerW / 2).attr('y', groupH + 44)
          .attr('text-anchor', 'middle').text(LBL.xLabel);
      }
    });
  }

  render();

  return {
    resize: render,
    destroy: () => { container.innerHTML = ''; },
    update: (newOpts) => { opts = { ...opts, ...newOpts }; render(); },
  };
}
