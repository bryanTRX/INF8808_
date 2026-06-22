import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, computed, inject } from '@angular/core';
import { VizDataService } from '../../core/services/viz-data.service';
import { createTooltip } from '../../viz-shared/utils/tooltip';
import { observeResize } from '../../viz-shared/utils/resize';
import { deferChartInit } from '../../viz-shared/utils/init-chart';
import { observeTheme } from '../../viz-shared/utils/observe-theme';
import { LangService } from '../../core/services/lang.service';
import { VizLoadState } from '../../core/i18n/viz-load-state';
import { createViz07Chart, Viz07Chart } from './chart';

@Component({
  selector: 'app-viz07',
  imports: [],
  templateUrl: './component.html',
  styleUrl: './component.css',
})
export class Viz07Component implements AfterViewInit, OnDestroy {
  @ViewChild('chart', { static: true }) chartRef!: ElementRef<HTMLElement>;
  readonly langService = inject(LangService);
  readonly loadState = new VizLoadState(() => this.langService.lang(), 'ready');

  stats: { label: string; value: string; hint: string }[] = [];

  readonly answerHeadline = computed(() => {
    if (!this._meta) return '';
    const weak = Math.abs(this._meta.correlation) < 0.05;
    return weak
      ? 'Song length has very little overall effect on popularity.'
      : 'Song length shows a slight link to popularity.';
  });

  readonly answerBody = computed(() => {
    if (!this._meta || this._overallAvg === null) return '';
    return `Overall average popularity is ${this._overallAvg.toFixed(1)}/100. Correlation r = ${this._meta.correlation}.`;
  });

  private _meta: { tracks_in_view: number; correlation: number; bin_width_minutes: number } | null = null;
  private _overallAvg: number | null = null;
  private _controller: Viz07Chart | undefined;

  private dataService = inject(VizDataService);
  private cleanupResize?: () => void;
  private cleanupTheme?: () => void;
  private tip = createTooltip();

  ngAfterViewInit() {
    this.dataService.loadDataset().subscribe({
      next: (rows) => {
        deferChartInit(() => {
          this._controller = createViz07Chart(
            this.chartRef.nativeElement,
            rows,
            this.tip,
            'en',
          );
          this.updateSummary();
          this.cleanupResize = observeResize(this.chartRef.nativeElement, () => this._controller?.resize());
          this.cleanupTheme = observeTheme(() => this._controller?.resize());
          this.loadState.setLoaded(rows.length);
        });
      },
      error: () => { this.loadState.setError(); },
    });
  }

  updateSummary() {
    if (!this._controller) return;
    this._meta = this._controller.getMeta();
    const fullData = this._controller.getFullBins();
    this._overallAvg =
      fullData.reduce((s, d) => s + d.avg_popularity * d.count, 0) /
      fullData.reduce((s, d) => s + d.count, 0);

    this.stats = [
      { label: 'Tracks', value: this._meta.tracks_in_view.toLocaleString(), hint: 'Under 15 min' },
      { label: 'Avg popularity', value: `${this._overallAvg.toFixed(1)}/100`, hint: 'Overall mean' },
      { label: 'Correlation', value: String(this._meta.correlation), hint: 'Duration and popularity' },
      { label: 'Bin size', value: '30 sec', hint: 'Each bar width' },
    ];
  }

  ngOnDestroy() {
    this.cleanupResize?.();
    this.cleanupTheme?.();
    this._controller?.destroy();
    this.tip.destroy();
  }
}
