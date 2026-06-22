import type { Lang } from '../services/lang.service';

export function vizStrings(_lang: Lang) {
  return {
    loading: 'Loading\u2026',
    loadedTracks: (n: number) => `Showing ${n.toLocaleString()} tracks`,
    loadedReady: (n: number) => `Showing ${n.toLocaleString()} tracks`,
    loadedArtists: (n: number) => `Showing ${n} artist profiles`,
    loadError: 'Failed to load dataset',
    chartLoading: 'Loading chart data\u2026',
  };
}
