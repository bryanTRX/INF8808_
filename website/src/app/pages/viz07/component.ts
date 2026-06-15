import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, computed, effect, inject } from '@angular/core';
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
  readonly langService = inject(LangService);
  readonly loadState = new VizLoadState(() => this.langService.lang(), 'ready');

  stats: { label: string; value: string; hint: string }[] = [];

  readonly answerHeadline = computed(() => {
    const lang = this.langService.lang();
    if (!this._meta) return '';
    const weak = Math.abs(this._meta.correlation) < 0.05;
    return lang === 'fr'
      ? (weak
          ? 'La durée du titre a très peu d\'effet global sur la popularité.'
          : 'La durée du titre montre un léger lien avec la popularité.')
      : (weak
          ? 'Song length has very little overall effect on popularity.'
          : 'Song length shows a slight link to popularity.');
  });

  readonly answerBody = computed(() => {
    const lang = this.langService.lang();
    if (!this._meta || this._overallAvg === null) return '';
    return lang === 'fr'
      ? `Popularité moyenne globale : ${this._overallAvg.toFixed(1)}/100. Corrélation r = ${this._meta.correlation}.`
      : `Overall average popularity is ${this._overallAvg.toFixed(1)}/100. Correlation r = ${this._meta.correlation}.`;
  });

  readonly defaultHoverText = computed(() => this._controller?.getDefaultHoverText() ?? '');

  private _meta: { tracks_in_view: number; correlation: number; bin_width_minutes: number } | null = null;
  private _overallAvg: number | null = null;
  private _controller: Viz07Chart | undefined;

  private dataService = inject(VizDataService);
  private cleanupResize?: () => void;
  private cleanupTheme?: () => void;
  private tip = createTooltip();

  constructor() {
    effect(() => {
      const l = this.langService.lang();
      this._controller?.setLang(l);
      this.updateSummary();
    });
  }

  get controller() { return this._controller; }

  ngAfterViewInit() {
    this.dataService.loadDataset().subscribe({
      next: (rows) => {
        deferChartInit(() => {
          this._controller = createViz07Chart(
            this.chartRef.nativeElement,
            rows,
            this.tip,
            (html) => { this.hoverHtml = html; },
            this.langService.lang(),
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
    const lang = this.langService.lang();
    this._meta = this._controller.getMeta();
    const fullData = this._controller.getFullBins();
    this._overallAvg =
      fullData.reduce((s, d) => s + d.avg_popularity * d.count, 0) /
      fullData.reduce((s, d) => s + d.count, 0);

    this.stats = lang === 'fr'
      ? [
          { label: 'Titres', value: this._meta.tracks_in_view.toLocaleString(), hint: 'Moins de 15 min' },
          { label: 'Popularité moy.', value: `${this._overallAvg.toFixed(1)}/100`, hint: 'Moyenne globale' },
          { label: 'Corrélation', value: String(this._meta.correlation), hint: 'Durée et popularité' },
          { label: 'Taille de bin', value: '30 sec', hint: 'Largeur de chaque barre' },
        ]
      : [
          { label: 'Tracks', value: this._meta.tracks_in_view.toLocaleString(), hint: 'Under 15 min' },
          { label: 'Avg popularity', value: `${this._overallAvg.toFixed(1)}/100`, hint: 'Overall mean' },
          { label: 'Correlation', value: String(this._meta.correlation), hint: 'Duration and popularity' },
          { label: 'Bin size', value: '30 sec', hint: 'Each bar width' },
        ];
  }

  toggleCounts() {
    this.showCounts = !this.showCounts;
    this._controller?.update({ showCounts: this.showCounts });
  }

  reset() {
    this.showCounts = true;
    this.hoverHtml = null;
    this._controller?.update({ showCounts: this.showCounts });
  }

  ngOnDestroy() {
    this.cleanupResize?.();
    this.cleanupTheme?.();
    this._controller?.destroy();
    this.tip.destroy();
  }
}
