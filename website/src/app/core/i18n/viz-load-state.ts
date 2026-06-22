import { computed, signal } from '@angular/core';
import { vizStrings } from './viz-status';

type LoadKind = 'tracks' | 'ready' | 'artists';

const S = vizStrings('en');

export class VizLoadState {
  private readonly isLoading = signal(true);
  private readonly hasError = signal(false);
  private readonly count = signal(0);

  constructor(private kind: LoadKind = 'tracks') {}

  readonly status = computed(() => {
    if (this.hasError()) return S.loadError;
    if (this.isLoading()) return S.loading;
    const n = this.count();
    if (this.kind === 'ready') return S.loadedReady(n);
    if (this.kind === 'artists') return S.loadedArtists(n);
    return S.loadedTracks(n);
  });

  readonly chartLoadingLabel = computed(() => S.chartLoading);

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
