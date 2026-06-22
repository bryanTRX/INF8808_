import { AfterViewInit, Component, DestroyRef, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { VizDataService } from '../../core/services/viz-data.service';
import { createTooltip } from '../../viz-shared/utils/tooltip';
import { observeResize } from '../../viz-shared/utils/resize';
import { deferChartInit } from '../../viz-shared/utils/init-chart';
import { observeTheme } from '../../viz-shared/utils/observe-theme';
import { VizLoadState } from '../../core/i18n/viz-load-state';
import { CorrelationMethod, createViz04Chart, Viz04Chart } from './chart';

@Component({
  selector: 'app-viz04',
  imports: [FormsModule],
  templateUrl: './component.html',
  styleUrl: './component.css',
})
export class Viz04Component implements AfterViewInit, OnDestroy {
  @ViewChild('chart', { static: true }) chartRef!: ElementRef<HTMLElement>;
  method: CorrelationMethod = 'pearson';
  readonly loadState = new VizLoadState();

  private readonly destroyRef = inject(DestroyRef);
  private dataService = inject(VizDataService);
  private controller?: Viz04Chart;
  private cleanupResize?: () => void;
  private cleanupTheme?: () => void;
  private tip = createTooltip();

  ngAfterViewInit() {
    this.dataService.loadDataset().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (rows) => {
        deferChartInit(() => {
          this.controller = createViz04Chart(this.chartRef.nativeElement, rows, this.tip, 'en');
          this.cleanupResize = observeResize(this.chartRef.nativeElement, () => this.controller?.resize());
          this.cleanupTheme = observeTheme(() => this.controller?.resize());
          this.loadState.setLoaded(rows.length);
        });
      },
      error: () => { this.loadState.setError(); },
    });
  }

  onMethodChange() {
    this.controller?.setMethod(this.method);
  }

  ngOnDestroy() {
    this.cleanupResize?.();
    this.cleanupTheme?.();
    this.controller?.destroy();
    this.tip.destroy();
  }
}
