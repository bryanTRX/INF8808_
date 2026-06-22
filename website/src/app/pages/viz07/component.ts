import { AfterViewInit, Component, DestroyRef, ElementRef, OnDestroy, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { VizDataService } from '../../core/services/viz-data.service';
import { createTooltip } from '../../viz-shared/utils/tooltip';
import { observeResize } from '../../viz-shared/utils/resize';
import { deferChartInit } from '../../viz-shared/utils/init-chart';
import { observeTheme } from '../../viz-shared/utils/observe-theme';
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
  readonly loadState = new VizLoadState('ready');

  stats: { label: string; value: string; hint: string }[] = [];

  private readonly _metaSig = signal<{ tracks_in_view: number; correlation: number; bin_width_minutes: number } | null>(null);
  private readonly _overallAvgSig = signal<number | null>(null);
  private _controller: Viz07Chart | undefined;

  readonly answerHeadline = computed(() => {
    const meta = this._metaSig();
    if (!meta) return '';
    const weak = Math.abs(meta.correlation) < 0.05;
    return weak
      ? 'Song length has very little overall effect on popularity.'
      : 'Song length shows a slight link to popularity.';
  });

  readonly answerBody = computed(() => {
    const meta = this._metaSig();
    const avg = this._overallAvgSig();
    if (!meta || avg === null) return '';
    return `Overall average popularity is ${avg.toFixed(1)}/100. Correlation r = ${meta.correlation}.`;
  });

  private readonly destroyRef = inject(DestroyRef);
  private dataService = inject(VizDataService);
  private cleanupResize?: () => void;
  private cleanupTheme?: () => void;
  private tip = createTooltip();

  ngAfterViewInit() {
    this.dataService.loadDataset().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
    const meta = this._controller.getMeta();
    this._metaSig.set(meta);
    const fullData = this._controller.getFullBins();
    const avg =
      fullData.reduce((s, d) => s + d.avg_popularity * d.count, 0) /
      fullData.reduce((s, d) => s + d.count, 0);
    this._overallAvgSig.set(avg);

    this.stats = [
      { label: 'Tracks', value: meta.tracks_in_view.toLocaleString(), hint: 'Under 15 min' },
      { label: 'Avg popularity', value: `${avg.toFixed(1)}/100`, hint: 'Overall mean' },
      { label: 'Correlation', value: String(meta.correlation), hint: 'Duration and popularity' },
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
