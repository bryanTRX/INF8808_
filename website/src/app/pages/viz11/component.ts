import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, computed, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VizDataService } from '../../core/services/viz-data.service';
import { createTooltip } from '../../viz-shared/utils/tooltip';
import { observeResize } from '../../viz-shared/utils/resize';
import { deferChartInit } from '../../viz-shared/utils/init-chart';
import { createViz11Chart, EnergyFeature, Viz11Chart, getEnergyFeatures } from './chart';
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

  feature: EnergyFeature = 'energy';
  readonly loadState = new VizLoadState(() => this.langService.lang());
  readonly langService = inject(LangService);

  readonly featureEntries = computed(() => getEnergyFeatures(this.langService.lang()));

  readonly pageTitle = computed(() => this.langService.lang() === 'fr'
    ? 'Caractéristiques audio moyennes par genre'
    : 'Average Audio Features by Genre');
  readonly pageSubtitle = computed(() => this.langService.lang() === 'fr'
    ? 'Quel genre est le plus énergique, le plus dansable, le plus joyeux ? Les barres sont triées du plus élevé au plus faible. Les lignes indiquent le premier et le troisième quartile.'
    : 'Which genre is the most energetic, the most danceable, or the most joyful? Bars are sorted from highest to lowest. Lines show the Q1 and Q3 quartiles.');

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
