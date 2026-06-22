import { computed, signal } from '@angular/core';
import { VIZ_STRINGS } from './viz-status';

type LoadKind = 'tracks' | 'ready' | 'artists';

export class VizLoadState {
  private readonly isLoading = signal(true);
  private readonly hasError = signal(false);
  private readonly count = signal(0);

  constructor(private kind: LoadKind = 'tracks') {}

  readonly status = computed(() => {
    if (this.hasError()) return VIZ_STRINGS.loadError;
    if (this.isLoading()) return VIZ_STRINGS.loading;
    const n = this.count();
    if (this.kind === 'ready') return VIZ_STRINGS.loadedReady(n);
    if (this.kind === 'artists') return VIZ_STRINGS.loadedArtists(n);
    return VIZ_STRINGS.loadedTracks(n);
  });

  readonly chartLoadingLabel = computed(() => VIZ_STRINGS.chartLoading);

  setLoading(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
  }

  setLoaded(count: number): void {
    this.isLoading.set(false);
    this.hasError.set(false);
    this.count.set(count);
  }

  setError(): void {
    this.isLoading.set(false);
    this.hasError.set(true);
  }

  loading(): boolean {
    return this.isLoading();
  }
}
