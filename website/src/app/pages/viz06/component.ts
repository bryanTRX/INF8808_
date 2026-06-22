import { AfterViewInit, Component, DestroyRef, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { VizDataService } from '../../core/services/viz-data.service';
import { createTooltip } from '../../viz-shared/utils/tooltip';
import { observeResize } from '../../viz-shared/utils/resize';
import { deferChartInit } from '../../viz-shared/utils/init-chart';
import { observeTheme } from '../../viz-shared/utils/observe-theme';
import { createViz06Chart, Viz06Chart } from './chart';
import { VizLoadState } from '../../core/i18n/viz-load-state';

@Component({
  selector: 'app-viz06',
  imports: [],
  templateUrl: './component.html',
  styleUrl: './component.css',
})
export class Viz06Component implements AfterViewInit, OnDestroy {
  @ViewChild('chart', { static: true }) chartRef!: ElementRef<HTMLElement>;
  readonly loadState = new VizLoadState();

  private readonly destroyRef = inject(DestroyRef);
  private dataService = inject(VizDataService);
  private controller?: Viz06Chart;
  private cleanupResize?: () => void;
  private cleanupTheme?: () => void;
  private tip = createTooltip();

  ngAfterViewInit() {
    this.dataService.loadDataset().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (rows) => {
        deferChartInit(() => {
          this.controller = createViz06Chart(this.chartRef.nativeElement, rows, this.tip, 'en');
          this.cleanupResize = observeResize(this.chartRef.nativeElement, () => this.controller?.resize());
          this.cleanupTheme = observeTheme(() => this.controller?.resize());
          this.loadState.setLoaded(rows.length);
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
