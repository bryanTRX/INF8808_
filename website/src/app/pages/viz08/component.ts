import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VizDataService } from '../../core/services/viz-data.service';
import { createTooltip } from '../../viz-shared/utils/tooltip';
import { observeResize } from '../../viz-shared/utils/resize';
import { deferChartInit } from '../../viz-shared/utils/init-chart';
import { observeTheme } from '../../viz-shared/utils/observe-theme';
import { VizLoadState } from '../../core/i18n/viz-load-state';
import { createViz08Chart, FEATURE_KEYS, FEATURE_LABELS_EN, FeatureKey, Viz08Chart } from './chart';

@Component({
  selector: 'app-viz08',
  imports: [FormsModule],
  templateUrl: './component.html',
  styleUrl: './component.css',
})
export class Viz08Component implements AfterViewInit, OnDestroy {
  @ViewChild('chart', { static: true }) chartRef!: ElementRef<HTMLElement>;
  readonly featureKeys = FEATURE_KEYS;
  readonly featureLabels = FEATURE_LABELS_EN;
  feature: FeatureKey = 'valence';
  readonly loadState = new VizLoadState();

  private dataService = inject(VizDataService);
  private controller?: Viz08Chart;
  private cleanupResize?: () => void;
  private cleanupTheme?: () => void;
  private tip = createTooltip();

  ngAfterViewInit() {
    this.dataService.loadDataset().subscribe({
      next: (rows) => {
        deferChartInit(() => {
          this.controller = createViz08Chart(this.chartRef.nativeElement, rows, this.tip);
          this.cleanupResize = observeResize(this.chartRef.nativeElement, () => this.controller?.resize());
          this.cleanupTheme = observeTheme(() => this.controller?.resize());
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
    this.cleanupTheme?.();
    this.controller?.destroy();
    this.tip.destroy();
  }
}
