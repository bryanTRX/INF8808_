import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VizDataService } from '../../core/services/viz-data.service';
import { createTooltip } from '../../viz-shared/utils/tooltip';
import { observeResize } from '../../viz-shared/utils/resize';
import { deferChartInit } from '../../viz-shared/utils/init-chart';
import { createViz14Chart, HEX_PAIRS, HexPairIdx, Viz14Chart } from './chart';
import { VizLoadState } from '../../core/i18n/viz-load-state';

@Component({
  selector: 'app-viz14',
  imports: [FormsModule],
  templateUrl: './component.html',
  styleUrl: './component.css',
})
export class Viz14Component implements AfterViewInit, OnDestroy {
  @ViewChild('chart', { static: true }) chartRef!: ElementRef<HTMLElement>;

  readonly pairs = HEX_PAIRS;
  pairIdx: HexPairIdx = 0;
  readonly loadState = new VizLoadState();

  private dataService = inject(VizDataService);
  private controller?: Viz14Chart;
  private cleanupResize?: () => void;
  private tip = createTooltip();

  ngAfterViewInit() {
    this.dataService.loadDataset().subscribe({
      next: (rows) => {
        deferChartInit(() => {
          this.controller = createViz14Chart(this.chartRef.nativeElement, rows, this.tip);
          this.cleanupResize = observeResize(this.chartRef.nativeElement, () => this.controller?.resize());
          this.loadState.setLoaded(rows.length);
        });
      },
      error: () => { this.loadState.setError(); },
    });
  }

  setPair(idx: number) {
    this.pairIdx = idx as HexPairIdx;
    this.controller?.setPair(this.pairIdx);
  }

  ngOnDestroy() {
    this.cleanupResize?.();
    this.controller?.destroy();
    this.tip.destroy();
  }
}
