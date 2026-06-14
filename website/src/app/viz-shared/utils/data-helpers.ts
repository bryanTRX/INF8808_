import * as d3 from 'd3';
import { TrackRow } from '../../core/models/track-row';

export type GenreRow = TrackRow & { genre: string };

/** Sépare les tags Spotify (ex. "pop;rock" → ["pop", "rock"]). */
export function splitGenres(trackGenre: unknown): string[] {
  return String(trackGenre || '')
    .split(';')
    .map((g) => g.trim().toLowerCase())
    .filter(Boolean);
}

/** Une entrée par (titre, tag de genre). */
export function explodeByGenre(rows: TrackRow[]): GenreRow[] {
  const out: GenreRow[] = [];
  for (const row of rows) {
    for (const genre of splitGenres(row.track_genre)) {
      out.push({ ...row, genre });
    }
  }
  return out;
}

/** Top N genres par médiane de popularité (calculée sur tags individuels). */
export function topGenresByMedianPopularity(rows: TrackRow[], topN = 50): string[] {
  const medians = d3.rollup(
    explodeByGenre(rows),
    (g) => d3.median(g, (d) => Number(d.popularity))!,
    (d) => d.genre,
  );
  return [...medians.entries()]
    .sort((a, b) => d3.descending(b[1]!, a[1]!))
    .slice(0, topN)
    .map(([g]) => g);
}

/** Titres dont au moins un tag est dans le top N — chaque titre compté une fois. */
export function filterTracksInTopGenres(rows: TrackRow[], topN = 50): TrackRow[] {
  const top = new Set(topGenresByMedianPopularity(rows, topN));
  return rows.filter((row) => splitGenres(row.track_genre).some((g) => top.has(g)));
}

/** Une ligne par (titre, genre) pour le top N — agrégations par genre. */
export function rowsForTopGenres(rows: TrackRow[], topN = 50): GenreRow[] {
  const top = new Set(topGenresByMedianPopularity(rows, topN));
  return explodeByGenre(rows).filter((d) => top.has(d.genre));
}

/** @deprecated Préférer rowsForTopGenres ou filterTracksInTopGenres selon le cas. */
export function filterTopGenres(rows: TrackRow[], topN = 50): GenreRow[] {
  return rowsForTopGenres(rows, topN);
}
