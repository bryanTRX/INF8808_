import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VizDataService } from '../../core/services/viz-data.service';
import { createTooltip } from '../../viz-shared/utils/tooltip';
import { observeResize } from '../../viz-shared/utils/resize';
import { deferChartInit } from '../../viz-shared/utils/init-chart';
import { observeTheme } from '../../viz-shared/utils/observe-theme';
import { buildTrackIndex, createViz11Chart, TrackSearchResult, Viz11Chart } from './chart';
import { VizLoadState } from '../../core/i18n/viz-load-state';

interface ArtistOption { name: string; trackCount: number }

@Component({
  selector: 'app-viz11',
  imports: [FormsModule],
  templateUrl: './component.html',
  styleUrl: './component.css',
})
export class Viz11Component implements AfterViewInit, OnDestroy {
  @ViewChild('chart', { static: true }) chartRef!: ElementRef<HTMLElement>;

  readonly loadState = new VizLoadState();

  artists: ArtistOption[] = [];
  tracksForArtist: TrackSearchResult[] = [];
  selectedArtist = '';
  selectedTrackId = '';
  minPop = 0;

  readonly ui = {
    artistLabel: 'Artist',
    trackLabel: 'Track',
    threshold: 'Min. pop.',
    pickArtist: '— Pick an artist —',
    pickTrack: '— Pick a track —',
  };

  private dataService = inject(VizDataService);
  private controller?: Viz11Chart;
  private cleanupResize?: () => void;
  private cleanupTheme?: () => void;
  private tip = createTooltip();

  ngAfterViewInit() {
    this.dataService.loadDataset().subscribe({
      next: (rows) => {
        deferChartInit(() => {
          const allTracks = buildTrackIndex(rows);

          const countMap = new Map<string, number>();
          allTracks.forEach((t) => countMap.set(t.artist, (countMap.get(t.artist) ?? 0) + 1));
          this.artists = [...countMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([name, trackCount]) => ({ name, trackCount }));

          this._tracksByArtist = new Map<string, TrackSearchResult[]>();
          allTracks.forEach((t) => {
            if (!this._tracksByArtist.has(t.artist)) this._tracksByArtist.set(t.artist, []);
            this._tracksByArtist.get(t.artist)!.push(t);
          });

          if (this.artists.length) {
            this.selectedArtist = this.artists[0].name;
            this.onArtistChange(true);
          }

          this.controller = createViz11Chart(this.chartRef.nativeElement, rows, this.tip);
          this.cleanupResize = observeResize(this.chartRef.nativeElement, () => this.controller?.resize());
          this.cleanupTheme = observeTheme(() => this.controller?.resize());
          this.loadState.setLoaded(rows.length);
          this.refresh();
        });
      },
      error: () => { this.loadState.setError(); },
    });
  }

  private _tracksByArtist = new Map<string, TrackSearchResult[]>();

  onArtistChange(autoSelectTop = false) {
    const tracks = (this._tracksByArtist.get(this.selectedArtist) ?? [])
      .slice()
      .sort((a, b) => b.popularity - a.popularity);
    this.tracksForArtist = tracks;
    if (autoSelectTop || !tracks.find((t) => t.trackId === this.selectedTrackId)) {
      this.selectedTrackId = tracks[0]?.trackId ?? '';
    }
    this.refresh();
  }

  refresh() {
    if (!this.selectedArtist || !this.selectedTrackId) return;
    this.controller?.setQuery(this.selectedArtist, this.selectedTrackId, this.minPop);
  }

  ngOnDestroy() {
    this.cleanupResize?.();
    this.cleanupTheme?.();
    this.controller?.destroy();
    this.tip.destroy();
  }
}
