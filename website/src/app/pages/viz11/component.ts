import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VizDataService } from '../../core/services/viz-data.service';
import { createTooltip } from '../../viz-shared/utils/tooltip';
import { observeResize } from '../../viz-shared/utils/resize';
import { deferChartInit } from '../../viz-shared/utils/init-chart';
import { createViz11Chart, ENERGY_FEATURES, EnergyFeature, Viz11Chart } from './chart';
import { LangService } from '../../core/services/lang.service';
import { VizLoadState } from '../../core/i18n/viz-load-state';

@Component({
  selector: 'app-viz11',
  imports: [FormsModule],
  templateUrl: './component.html',
  styleUrl: './component.css',
})
export class Viz11Component implements AfterViewInit, OnDestroy {
  @ViewChild('chart', { static: true }) chartRef!: ElementRef<HTMLElement>;

  readonly featureEntries = ENERGY_FEATURES;
  feature: EnergyFeature = 'energy';
  readonly loadState = new VizLoadState(() => this.langService.lang());

  readonly langService = inject(LangService);
  private dataService = inject(VizDataService);
  private controller?: Viz11Chart;
  private cleanupResize?: () => void;
  private tip = createTooltip();

  constructor() {
    effect(() => { const l = this.langService.lang(); this.controller?.setLang(l); });
  }

  ngAfterViewInit() {
    this.dataService.loadDataset().subscribe({
      next: (rows) => {
        deferChartInit(() => {
          this.controller = createViz11Chart(this.chartRef.nativeElement, rows, this.tip, this.langService.lang());
          this.cleanupResize = observeResize(this.chartRef.nativeElement, () => this.controller?.resize());
          this.loadState.setLoaded(rows.length);
        });
      },
      error: () => { this.loadState.setError(); },
    });
  }

  onFeatureChange() {
    this.controller?.setFeature(this.feature);
  }

  ngOnDestroy() {
    this.cleanupResize?.();
    this.controller?.destroy();
    this.tip.destroy();
  }
}
