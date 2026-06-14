import { DecimalPipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VizDataService } from '../../core/services/viz-data.service';
import { createTooltip } from '../../viz-shared/utils/tooltip';
import { observeResize } from '../../viz-shared/utils/resize';
import { deferChartInit } from '../../viz-shared/utils/init-chart';
import { observeTheme } from '../../viz-shared/utils/observe-theme';
import { createViz06Chart, getViz06Stats, Viz06Chart } from './chart';
import { LangService } from '../../core/services/lang.service';
import { VizLoadState } from '../../core/i18n/viz-load-state';

@Component({
  selector: 'app-viz06',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './component.html',
  styleUrl: './component.css',
})
export class Viz06Component implements AfterViewInit, OnDestroy {
  @ViewChild('chart', { static: true }) chartRef!: ElementRef<HTMLElement>;
  sampleSize = 700;
  sharedScales = true;
  search = '';
  readonly loadState = new VizLoadState(() => this.langService.lang());
  stats: ReturnType<typeof getViz06Stats> = [];

  readonly langService = inject(LangService);
  private dataService = inject(VizDataService);
  private controller?: Viz06Chart;
  private cleanupResize?: () => void;
  private cleanupTheme?: () => void;
  private tip = createTooltip();

  constructor() {
    effect(() => { const l = this.langService.lang(); this.controller?.setLang(l); });
  }

  ngAfterViewInit() {
    this.dataService.loadDataset().subscribe({
      next: (rows) => {
        deferChartInit(() => {
          this.stats = getViz06Stats(rows);
          this.controller = createViz06Chart(this.chartRef.nativeElement, rows, this.tip, this.langService.lang());
          this.cleanupResize = observeResize(this.chartRef.nativeElement, () => this.refresh());
          this.cleanupTheme = observeTheme(() => this.refresh());
          this.refresh();
          this.loadState.setLoaded(rows.length);
        });
      },
      error: () => { this.loadState.setError(); },
    });
  }

  refresh() {
    this.controller?.update({ sampleSize: this.sampleSize, sharedScales: this.sharedScales, search: this.search.trim() });
  }

  reset() {
    this.sampleSize = 700;
    this.sharedScales = true;
    this.search = '';
    this.refresh();
  }

  ngOnDestroy() {
    this.cleanupResize?.();
    this.cleanupTheme?.();
    this.controller?.destroy();
    this.tip.destroy();
  }
}
