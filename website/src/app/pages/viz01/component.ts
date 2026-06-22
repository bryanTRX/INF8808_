import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { VizDataService } from '../../core/services/viz-data.service';
import { createTooltip } from '../../viz-shared/utils/tooltip';
import { observeResize } from '../../viz-shared/utils/resize';
import { deferChartInit } from '../../viz-shared/utils/init-chart';
import { observeTheme } from '../../viz-shared/utils/observe-theme';
import { ALL_DIMS, DEFAULT_DIM_KEYS, createViz01Chart, Viz01Chart } from './chart';
import { VizLoadState } from '../../core/i18n/viz-load-state';

interface DimControl {
  key: string;
  en: string;
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

  readonly loadState = new VizLoadState();

  dimControls: DimControl[] = ALL_DIMS.map((d) => ({
    key: d.key,
    en: d.en,
    checked: DEFAULT_DIM_KEYS.includes(d.key),
  }));

  private readonly destroyRef = inject(DestroyRef);
  private dataService = inject(VizDataService);
  private controller?: Viz01Chart;
  private cleanupResize?: () => void;
  private cleanupTheme?: () => void;
  private tip = createTooltip();

  get selectedDimKeys(): string[] {
    return this.dimControls.filter((d) => d.checked).map((d) => d.key);
  }

  get canUncheck(): boolean {
    return this.selectedDimKeys.length > 2;
  }

  onDimChange() {
    if (this.selectedDimKeys.length < 2) return;
    this.controller?.update({ dimKeys: this.selectedDimKeys, lang: 'en' });
  }

  ngAfterViewInit() {
    this.dataService.loadDataset().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (rows) => {
        deferChartInit(() => {
          this.controller = createViz01Chart(
            this.chartRef.nativeElement,
            rows,
            this.tip,
            { dimKeys: this.selectedDimKeys, lang: 'en' },
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
