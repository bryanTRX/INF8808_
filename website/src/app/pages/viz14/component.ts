import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, computed, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VizDataService } from '../../core/services/viz-data.service';
import { createTooltip } from '../../viz-shared/utils/tooltip';
import { observeResize } from '../../viz-shared/utils/resize';
import { deferChartInit } from '../../viz-shared/utils/init-chart';
import { createViz14Chart, getHexPairs, HexPairIdx, Viz14Chart } from './chart';
import { LangService } from '../../core/services/lang.service';
import { VizLoadState } from '../../core/i18n/viz-load-state';

@Component({
  selector: 'app-viz14',
  imports: [FormsModule],
  templateUrl: './component.html',
  styleUrl: './component.css',
})
export class Viz14Component implements AfterViewInit, OnDestroy {
  @ViewChild('chart', { static: true }) chartRef!: ElementRef<HTMLElement>;

  readonly pairs = computed(() => getHexPairs(this.langService.lang()));
  pairIdx: HexPairIdx = 0;
  readonly loadState = new VizLoadState(() => this.langService.lang());

  readonly langService = inject(LangService);
  private dataService = inject(VizDataService);
  private controller?: Viz14Chart;
  private cleanupResize?: () => void;
  private tip = createTooltip();

  constructor() {
    effect(() => { const l = this.langService.lang(); this.controller?.setLang(l); });
  }

  ngAfterViewInit() {
    this.dataService.loadDataset().subscribe({
      next: (rows) => {
        deferChartInit(() => {
          this.controller = createViz14Chart(this.chartRef.nativeElement, rows, this.tip, this.langService.lang());
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
