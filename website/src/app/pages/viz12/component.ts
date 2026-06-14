import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VizDataService } from '../../core/services/viz-data.service';
import { createTooltip } from '../../viz-shared/utils/tooltip';
import { observeResize } from '../../viz-shared/utils/resize';
import { deferChartInit } from '../../viz-shared/utils/init-chart';
import { BeeGrouping, createViz12Chart, Viz12Chart } from './chart';
import { LangService } from '../../core/services/lang.service';
import { VizLoadState } from '../../core/i18n/viz-load-state';

@Component({
  selector: 'app-viz12',
  imports: [FormsModule],
  templateUrl: './component.html',
  styleUrl: './component.css',
})
export class Viz12Component implements AfterViewInit, OnDestroy {
  @ViewChild('chart', { static: true }) chartRef!: ElementRef<HTMLElement>;

  groupBy: BeeGrouping = 'none';
  sampleSize = 3000;
  search = '';
  readonly loadState = new VizLoadState(() => this.langService.lang());

  readonly langService = inject(LangService);
  private dataService = inject(VizDataService);
  private controller?: Viz12Chart;
  private cleanupResize?: () => void;
  private tip = createTooltip();

  constructor() {
    effect(() => { const l = this.langService.lang(); this.controller?.setLang(l); });
  }

  ngAfterViewInit() {
    this.dataService.loadDataset().subscribe({
      next: (rows) => {
        deferChartInit(() => {
          this.controller = createViz12Chart(this.chartRef.nativeElement, rows, this.tip, this.langService.lang());
          this.cleanupResize = observeResize(this.chartRef.nativeElement, () => this.refresh());
          this.refresh();
          this.loadState.setLoaded(rows.length);
        });
      },
      error: () => { this.loadState.setError(); },
    });
  }

  refresh() {
    this.controller?.update({ groupBy: this.groupBy, sampleSize: this.sampleSize, search: this.search.trim() });
  }

  reset() {
    this.groupBy = 'none';
    this.sampleSize = 3000;
    this.search = '';
    this.refresh();
  }

  ngOnDestroy() {
    this.cleanupResize?.();
    this.controller?.destroy();
    this.tip.destroy();
  }
}
