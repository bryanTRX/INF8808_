import type { Lang } from '../services/lang.service';

export function vizStrings(lang: Lang) {
  if (lang === 'fr') {
    return {
      loading: 'Chargement…',
      loadedTracks: (n: number) => `${n.toLocaleString('fr-CA')} titres chargés`,
      loadedReady: (n: number) => `Prêt — ${n.toLocaleString('fr-CA')} titres chargés`,
      loadedArtists: (n: number) => `${n} profils d'artistes chargés`,
      loadError: 'Erreur : impossible de charger les données',
      chartLoading: 'Chargement des données…',
    };
  }

  return {
    loading: 'Loading…',
    loadedTracks: (n: number) => `Showing ${n.toLocaleString()} tracks`,
    loadedReady: (n: number) => `Ready — ${n.toLocaleString()} tracks loaded`,
    loadedArtists: (n: number) => `Ready — ${n} artist profiles`,
    loadError: 'Failed to load dataset',
    chartLoading: 'Loading chart data…',
  };
}
