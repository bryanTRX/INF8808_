import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  imports: [FormsModule],
  templateUrl: './component.html',
  styleUrl: './component.css',
})
export class Viz07Component implements AfterViewInit, OnDestroy {
  @ViewChild('chart', { static: true }) chartRef!: ElementRef<HTMLElement>;
  showCounts = true;
  hoverHtml: string | null = null;
  answerHeadline = '';
  answerBody = '';
  readonly langService = inject(LangService);
  readonly loadState = new VizLoadState(() => this.langService.lang(), 'ready');

  stats: { label: string; value: string; hint: string }[] = [];

  private dataService = inject(VizDataService);
  private controller?: Viz07Chart;
  private cleanupResize?: () => void;
  private cleanupTheme?: () => void;
  private tip = createTooltip();

  ngAfterViewInit() {
    this.dataService.loadDataset().subscribe({
      next: (rows) => {
        deferChartInit(() => {
          this.controller = createViz07Chart(
            this.chartRef.nativeElement,
            rows,
            this.tip,
            (html) => { this.hoverHtml = html; },
          );
          this.updateSummary();
          this.cleanupResize = observeResize(this.chartRef.nativeElement, () => this.controller?.resize());
          this.cleanupTheme = observeTheme(() => this.controller?.resize());
          this.loadState.setLoaded(rows.length);
        });
      },
      error: () => { this.loadState.setError(); },
    });
  }

  updateSummary() {
    if (!this.controller) return;
    const meta = this.controller.getMeta();
    const fullData = this.controller.getFullBins();
    const overallAvg = fullData.reduce((s, d) => s + d.avg_popularity * d.count, 0) /
      fullData.reduce((s, d) => s + d.count, 0);
    const weak = Math.abs(meta.correlation) < 0.05;
    this.answerHeadline = weak
      ? 'Song length has very little overall effect on popularity.'
      : 'Song length shows a slight link to popularity.';
    this.answerBody = `Overall average popularity is ${overallAvg.toFixed(1)}/100. Correlation r = ${meta.correlation}.`;
    this.stats = [
      { label: 'Songs', value: meta.tracks_in_view.toLocaleString(), hint: 'Under 15 min' },
      { label: 'Avg. popularity', value: `${overallAvg.toFixed(1)}/100`, hint: 'Overall mean' },
      { label: 'Correlation', value: String(meta.correlation), hint: 'Duration vs. pop.' },
      { label: 'Bin size', value: '30 sec', hint: 'Each bar width' },
    ];
  }

  toggleCounts() {
    this.showCounts = !this.showCounts;
    this.controller?.update({ showCounts: this.showCounts });
  }

  resetView() {
    this.controller?.update({ showCounts: this.showCounts });
  }

  focusRange(min: number, max: number) {
    this.controller?.update({ showCounts: this.showCounts, rangeMin: min, rangeMax: max });
  }

  ngOnDestroy() {
    this.cleanupResize?.();
    this.cleanupTheme?.();
    this.controller?.destroy();
    this.tip.destroy();
  }
}
