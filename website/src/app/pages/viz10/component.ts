import { AfterViewInit, Component, DestroyRef, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { VizDataService } from '../../core/services/viz-data.service';
import { createTooltip } from '../../viz-shared/utils/tooltip';
import { observeResize } from '../../viz-shared/utils/resize';
import { deferChartInit } from '../../viz-shared/utils/init-chart';
import { observeTheme } from '../../viz-shared/utils/observe-theme';
import { createViz10Chart, Performer, Viz10Chart } from './chart';
import { VizLoadState } from '../../core/i18n/viz-load-state';

@Component({
  selector: 'app-viz10',
  imports: [],
  templateUrl: './component.html',
  styleUrl: './component.css',
})
export class Viz10Component implements AfterViewInit, OnDestroy {
  @ViewChild('chart', { static: true }) chartRef!: ElementRef<HTMLElement>;

  performers: Performer[] = [];
  readonly loadState = new VizLoadState('artists');

  private readonly destroyRef = inject(DestroyRef);
  private dataService = inject(VizDataService);
  private controller?: Viz10Chart;
  private cleanupResize?: () => void;
  private cleanupTheme?: () => void;
  private tip = createTooltip();

  ngAfterViewInit() {
    forkJoin({
      rows: this.dataService.loadDataset(),
      performers: this.dataService.loadTopPerformers(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ rows, performers }) => {
        deferChartInit(() => {
          this.performers = performers;
          this.controller = createViz10Chart(
            this.chartRef.nativeElement,
            rows,
            performers,
            this.tip,
            'en',
          );
          this.cleanupResize = observeResize(this.chartRef.nativeElement, () => this.controller?.resize());
          this.cleanupTheme = observeTheme(() => this.controller?.resize());
          this.loadState.setLoaded(performers.length);
        });
      },
      error: () => { this.loadState.setError(); },
    });
  }

  ngOnDestroy() {
    this.cleanupResize?.();
    this.cleanupTheme?.();
    this.controller?.destroy();
    this.tip.destroy();
  }
}
