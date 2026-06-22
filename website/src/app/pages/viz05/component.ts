import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VizDataService } from '../../core/services/viz-data.service';
import { createTooltip } from '../../viz-shared/utils/tooltip';
import { observeResize } from '../../viz-shared/utils/resize';
import { deferChartInit } from '../../viz-shared/utils/init-chart';
import { observeTheme } from '../../viz-shared/utils/observe-theme';
import { createViz05Chart, MAJOR_GENRES, Viz05Chart, Viz05State } from './chart';

const GENRE_LABELS_EN: Record<string, string> = {
  pop: 'Pop', rock: 'Rock', 'hip-hop': 'Hip-Hop', electronic: 'Electronic',
  dance: 'Dance', indie: 'Indie', 'r&b': 'R&B', country: 'Country',
  jazz: 'Jazz', classical: 'Classical', latin: 'Latin', metal: 'Metal',
};
import { LangService } from '../../core/services/lang.service';
import { VizLoadState } from '../../core/i18n/viz-load-state';

@Component({
  selector: 'app-viz05',
  imports: [FormsModule],
  templateUrl: './component.html',
  styleUrl: './component.css',
})
export class Viz05Component implements AfterViewInit, OnDestroy {
  @ViewChild('chart', { static: true }) chartRef!: ElementRef<HTMLElement>;
  readonly genres = MAJOR_GENRES;
  readonly genreLabelsEn = GENRE_LABELS_EN;
  selectedGenres = new Set(['pop', 'rock', 'hip-hop', 'electronic', 'jazz', 'classical']);
  sampleSize = 250;
  sharedScales = true;
  readonly loadState = new VizLoadState(() => this.langService.lang());

  readonly langService = inject(LangService);
  private dataService = inject(VizDataService);
  private controller?: Viz05Chart;
  private cleanupResize?: () => void;
  private cleanupTheme?: () => void;
  private tip = createTooltip();

  ngAfterViewInit() {
    this.dataService.loadDataset().subscribe({
      next: (rows) => {
        deferChartInit(() => {
          this.controller = createViz05Chart(this.chartRef.nativeElement, rows, this.tip, 'en');
          this.cleanupResize = observeResize(this.chartRef.nativeElement, () => this.refresh());
          this.cleanupTheme = observeTheme(() => this.refresh());
          this.refresh();
          this.loadState.setLoaded(rows.length);
        });
      },
      error: () => { this.loadState.setError(); },
    });
  }

  isSelected(genre: string) { return this.selectedGenres.has(genre); }

  toggleGenre(genre: string, checked: boolean) {
    if (checked) this.selectedGenres.add(genre);
    else this.selectedGenres.delete(genre);
    this.refresh();
  }

  reset() {
    this.selectedGenres = new Set(['pop', 'rock', 'hip-hop', 'electronic', 'dance', 'latin']);
    this.sampleSize = 250;
    this.sharedScales = true;
    this.refresh();
  }

  refresh() {
    const state: Viz05State = {
      selectedGenres: this.selectedGenres as Viz05State['selectedGenres'],
      sampleSize: this.sampleSize,
      sharedScales: this.sharedScales,
    };
    this.controller?.update(state);
  }

  ngOnDestroy() {
    this.cleanupResize?.();
    this.cleanupTheme?.();
    this.controller?.destroy();
    this.tip.destroy();
  }
}
