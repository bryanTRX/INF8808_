import { computed, signal } from '@angular/core';
import type { Lang } from '../services/lang.service';
import { vizStrings } from './viz-status';

type LoadKind = 'tracks' | 'ready' | 'artists';

export class VizLoadState {
  private readonly isLoading = signal(true);
  private readonly hasError = signal(false);
  private readonly count = signal(0);

  constructor(
    private getLang: () => Lang,
    private kind: LoadKind = 'tracks',
  ) {}

  readonly status = computed(() => {
    const s = vizStrings(this.getLang());
    if (this.hasError()) return s.loadError;
    if (this.isLoading()) return s.loading;
    const n = this.count();
    if (this.kind === 'ready') return s.loadedReady(n);
    if (this.kind === 'artists') return s.loadedArtists(n);
    return s.loadedTracks(n);
  });

  readonly chartLoadingLabel = computed(() => vizStrings(this.getLang()).chartLoading);

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
