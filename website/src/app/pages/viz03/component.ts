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
import { SortOrder, createViz03Chart, Viz03Chart } from './chart';
import { LangService } from '../../core/services/lang.service';
import { VizLoadState } from '../../core/i18n/viz-load-state';

@Component({
  selector: 'app-viz03',
  imports: [FormsModule],
  templateUrl: './component.html',
  styleUrl: './component.css',
})
export class Viz03Component implements AfterViewInit, OnDestroy {
  @ViewChild('chart', { static: true }) chartRef!: ElementRef<HTMLElement>;

  readonly langService = inject(LangService);
  readonly loadState = new VizLoadState(() => this.langService.lang());

  sortOrder: SortOrder = 'asc';

  private dataService = inject(VizDataService);
  private controller?: Viz03Chart;
  private cleanupResize?: () => void;
  private cleanupTheme?: () => void;
  private tip = createTooltip();

  setSortOrder(order: SortOrder) {
    this.sortOrder = order;
    this.controller?.update({ sortOrder: order, lang: 'en' });
  }

  ngAfterViewInit() {
    this.dataService.loadDataset().subscribe({
      next: (rows) => {
        deferChartInit(() => {
          this.controller = createViz03Chart(
            this.chartRef.nativeElement,
            rows,
            this.tip,
            { sortOrder: this.sortOrder, lang: 'en' },
          );
          this.cleanupResize = observeResize(this.chartRef.nativeElement, () =>
            this.controller?.resize(),
          );
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
