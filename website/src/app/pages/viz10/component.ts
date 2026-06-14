import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, computed, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { VizDataService } from '../../core/services/viz-data.service';
import { createTooltip } from '../../viz-shared/utils/tooltip';
import { observeResize } from '../../viz-shared/utils/resize';
import { deferChartInit } from '../../viz-shared/utils/init-chart';
import { observeTheme } from '../../viz-shared/utils/observe-theme';
import { createViz10Chart, getTrendMetrics, Performer, TrendMetric, Viz10Chart, Viz10State } from './chart';
import { LangService } from '../../core/services/lang.service';
import { VizLoadState } from '../../core/i18n/viz-load-state';

@Component({
  selector: 'app-viz10',
  imports: [FormsModule],
  templateUrl: './component.html',
  styleUrl: './component.css',
})
export class Viz10Component implements AfterViewInit, OnDestroy {
  @ViewChild('radarChart', { static: true }) radarRef!: ElementRef<HTMLElement>;
  @ViewChild('trendChart', { static: true }) trendRef!: ElementRef<HTMLElement>;

  performers: Performer[] = [];
  selectedArtists = new Set<string>();
  trendMetric: TrendMetric = 'durationMinutes';
  search = '';
  readonly langService = inject(LangService);
  readonly loadState = new VizLoadState(() => this.langService.lang(), 'artists');
  readonly trendMetrics = computed(() => getTrendMetrics(this.langService.lang()));
  readonly ui = computed(() => this.langService.lang() === 'fr' ? {
    search: 'Recherche',
    searchPlaceholder: 'Filtrer les artistes',
    trendMetric: 'Métrique de tendance',
    radarTitle: 'Profil radar',
    trendTitle: 'Panneau de tendance',
  } : {
    search: 'Search',
    searchPlaceholder: 'Filter artists',
    trendMetric: 'Trend metric',
    radarTitle: 'Radar profile',
    trendTitle: 'Trend panel',
  });

  private dataService = inject(VizDataService);
  private controller?: Viz10Chart;
  private cleanupResize?: () => void;
  private cleanupTheme?: () => void;
  private tip = createTooltip();

  constructor() {
    effect(() => { const l = this.langService.lang(); this.controller?.setLang(l); });
  }

  ngAfterViewInit() {
    forkJoin({
      rows: this.dataService.loadDataset(),
      performers: this.dataService.loadTopPerformers(),
    }).subscribe({
      next: ({ rows, performers }) => {
        deferChartInit(() => {
          this.performers = performers;
          this.selectedArtists = new Set(performers.slice(0, 3).map((p) => p.name));
          this.controller = createViz10Chart(
            this.radarRef.nativeElement,
            this.trendRef.nativeElement,
            rows,
            performers,
            this.tip,
            this.langService.lang(),
          );
          this.cleanupResize = observeResize(this.radarRef.nativeElement.parentElement!, () => this.refresh());
          this.cleanupTheme = observeTheme(() => this.refresh());
          this.refresh();
          this.loadState.setLoaded(performers.length);
        });
      },
      error: () => { this.loadState.setError(); },
    });
  }

  filteredPerformers() {
    const q = this.search.trim().toLowerCase();
    return this.performers.filter((p) => !q || p.name.toLowerCase().includes(q));
  }

  isSelected(name: string) { return this.selectedArtists.has(name); }

  toggleArtist(name: string, checked: boolean) {
    if (checked) this.selectedArtists.add(name);
    else if (this.selectedArtists.size > 1) this.selectedArtists.delete(name);
    this.refresh();
  }

  refresh() {
    const state: Viz10State = {
      selectedArtists: this.selectedArtists,
      trendMetric: this.trendMetric,
      search: this.search.trim(),
    };
    this.controller?.update(state);
  }

  ngOnDestroy() {
    this.cleanupResize?.();
    this.cleanupTheme?.();
    this.controller?.destroy();
    this.tip.destroy();
  }
}
