import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VizDataService } from '../../core/services/viz-data.service';
import { createTooltip } from '../../viz-shared/utils/tooltip';
import { observeResize } from '../../viz-shared/utils/resize';
import { deferChartInit } from '../../viz-shared/utils/init-chart';
import { observeTheme } from '../../viz-shared/utils/observe-theme';
import { ALL_DIMS, DEFAULT_DIM_KEYS, createViz01Chart, Viz01Chart } from './chart';
import { LangService } from '../../core/services/lang.service';
import { VizLoadState } from '../../core/i18n/viz-load-state';

export interface DimControl {
  key: string;
  en: string;
  fr: string;
  checked: boolean;
}

@Component({
  selector: 'app-viz01',
  imports: [FormsModule],
  templateUrl: './component.html',
  styleUrl: './component.css',
})
export class Viz01Component implements AfterViewInit, OnDestroy {
  @ViewChild('chart', { static: true }) chartRef!: ElementRef<HTMLElement>;

  readonly langService = inject(LangService);
  readonly loadState = new VizLoadState(() => this.langService.lang());

  dimControls: DimControl[] = ALL_DIMS.map((d) => ({
    key: d.key,
    en: d.en,
    fr: d.fr,
    checked: DEFAULT_DIM_KEYS.includes(d.key),
  }));

  private dataService = inject(VizDataService);
  private controller?: Viz01Chart;
  private cleanupResize?: () => void;
  private cleanupTheme?: () => void;
  private tip = createTooltip();

  constructor() {
    effect(() => {
      const lang = this.langService.lang() as 'en' | 'fr';
      this.controller?.update({ lang });
    });
  }

  get lang(): 'en' | 'fr' {
    return this.langService.lang() as 'en' | 'fr';
  }

  get selectedDimKeys(): string[] {
    return this.dimControls.filter((d) => d.checked).map((d) => d.key);
  }

  get canUncheck(): boolean {
    return this.selectedDimKeys.length > 2;
  }

  onDimChange() {
    if (this.selectedDimKeys.length < 2) return;
    this.controller?.update({ dimKeys: this.selectedDimKeys, lang: this.lang });
  }

  ngAfterViewInit() {
    this.dataService.loadDataset().subscribe({
      next: (rows) => {
        deferChartInit(() => {
          this.controller = createViz01Chart(
            this.chartRef.nativeElement,
            rows,
            this.tip,
            { dimKeys: this.selectedDimKeys, lang: this.lang },
          );
          this.cleanupResize = observeResize(this.chartRef.nativeElement, () =>
            this.controller?.resize(),
          );
          this.cleanupTheme = observeTheme(() => this.controller?.resize());
          this.loadState.setLoaded(rows.length);
        });
      },
      error: () => {
        this.loadState.setError();
      },
    });
  }

  ngOnDestroy() {
    this.cleanupResize?.();
    this.cleanupTheme?.();
    this.controller?.destroy();
    this.tip.destroy();
  }
}
