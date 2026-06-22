import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VizDataService } from '../../core/services/viz-data.service';
import { createTooltip } from '../../viz-shared/utils/tooltip';
import { observeResize } from '../../viz-shared/utils/resize';
import { deferChartInit } from '../../viz-shared/utils/init-chart';
import { createViz13Chart, SCATTER_AXES, ScatterAxisKey, Viz13Chart } from './chart';
import { VizLoadState } from '../../core/i18n/viz-load-state';

@Component({
  selector: 'app-viz13',
  imports: [FormsModule],
  templateUrl: './component.html',
  styleUrl: './component.css',
})
export class Viz13Component implements AfterViewInit, OnDestroy {
  @ViewChild('chart', { static: true }) chartRef!: ElementRef<HTMLElement>;

  readonly axes = SCATTER_AXES;
  xAxis: ScatterAxisKey = 'energy';
  yAxis: ScatterAxisKey = 'popularity';
  sampleSize = 2000;
  search = '';
  showTrend = true;
  readonly loadState = new VizLoadState();

  private dataService = inject(VizDataService);
  private controller?: Viz13Chart;
  private cleanupResize?: () => void;
  private tip = createTooltip();

  ngAfterViewInit() {
    this.dataService.loadDataset().subscribe({
      next: (rows) => {
        deferChartInit(() => {
          this.controller = createViz13Chart(this.chartRef.nativeElement, rows, this.tip);
          this.cleanupResize = observeResize(this.chartRef.nativeElement, () => this.refresh());
          this.refresh();
          this.loadState.setLoaded(rows.length);
        });
      },
      error: () => { this.loadState.setError(); },
    });
  }

  refresh() {
    this.controller?.update({
      xAxis: this.xAxis, yAxis: this.yAxis,
      sampleSize: this.sampleSize, search: this.search.trim(), showTrend: this.showTrend,
    });
  }

  ngOnDestroy() {
    this.cleanupResize?.();
    this.controller?.destroy();
    this.tip.destroy();
  }
}
