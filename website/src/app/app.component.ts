import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  computed,
  inject,
} from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { appStrings } from './core/i18n/app-strings';
import { LangService } from './core/services/lang.service';
import { ThemeService } from './core/services/theme.service';
import { getVizCatalog } from './viz-shared/viz-catalog';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mainScroll') mainScroll?: ElementRef<HTMLElement>;

  private readonly langService = inject(LangService);
  private themeService = inject(ThemeService);
  readonly catalog = computed(() => getVizCatalog(this.langService.lang()));
  readonly strings = computed(() => appStrings(this.langService.lang()));
  readonly sectionAnchors = computed(() => ['dashboard', ...this.catalog().map((viz) => viz.anchor)]);

  activeAnchor = 'dashboard';
  private router = inject(Router);
  private zone = inject(NgZone);
  private routerSub?: Subscription;
  private scrollRaf = 0;
  private observer?: IntersectionObserver;
  private scrollingProgrammatically = false;

  ngAfterViewInit() {
    this.routerSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.setupScrollSpy());

    this.setupScrollSpy();
  }

  readonly theme = this.themeService.mode;

  toggleTheme() {
    this.themeService.toggle();
  }

  scrollTo(anchor: string, event?: Event) {
    event?.preventDefault();
    this.scrollToSection(anchor);
  }

  onMainScroll() {
    if (this.scrollingProgrammatically) return;

    if (this.scrollRaf) return;
    this.scrollRaf = requestAnimationFrame(() => {
      this.scrollRaf = 0;
      this.updateActiveFromScroll();
    });
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
    this.observer?.disconnect();
    if (this.scrollRaf) cancelAnimationFrame(this.scrollRaf);
  }

  private setupScrollSpy() {
    this.observer?.disconnect();

    requestAnimationFrame(() => {
      const container = this.mainScroll?.nativeElement;
      if (!container) return;

      const targets = this.sectionAnchors()
        .map((id) => container.querySelector<HTMLElement>(`#${id}`))
        .filter((el): el is HTMLElement => !!el);

      if (!targets.length) {
        setTimeout(() => this.setupScrollSpy(), 100);
        return;
      }

      this.zone.runOutsideAngular(() => {
        this.observer = new IntersectionObserver(
          (entries) => {
            if (this.scrollingProgrammatically) return;

            const visible = entries
              .filter((entry) => entry.isIntersecting)
              .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

            if (!visible.length) return;

            const next = visible[0].target.id;
            this.zone.run(() => {
              if (this.activeAnchor !== next) this.activeAnchor = next;
            });
          },
          {
            root: container,
            rootMargin: '-10% 0px -60% 0px',
            threshold: [0, 0.15, 0.35, 0.55, 0.75],
          },
        );

        targets.forEach((target) => this.observer!.observe(target));
      });

      this.updateActiveFromScroll();
    });
  }

  private scrollToSection(anchor: string, attempt = 0) {
    const container = this.mainScroll?.nativeElement;
    if (!container) return;

    const target = container.querySelector<HTMLElement>(`#${CSS.escape(anchor)}`);
    if (!target) {
      if (attempt < 20) {
        setTimeout(() => this.scrollToSection(anchor, attempt + 1), 50);
      }
      return;
    }

    this.activeAnchor = anchor;
    this.scrollingProgrammatically = true;

    const offset = 16;
    const top =
      target.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop -
      offset;

    container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    this.scrollNavItemIntoView(anchor);

    window.setTimeout(() => {
      this.scrollingProgrammatically = false;
      this.updateActiveFromScroll();
    }, 600);
  }

  private updateActiveFromScroll() {
    const container = this.mainScroll?.nativeElement;
    if (!container) return;

    const marker = container.getBoundingClientRect().top + 80;
    let current = this.sectionAnchors()[0];

    for (const id of this.sectionAnchors()) {
      const el = container.querySelector<HTMLElement>(`#${id}`);
      if (!el) continue;
      if (el.getBoundingClientRect().top <= marker) current = id;
    }

    this.activeAnchor = current;
  }

  private scrollNavItemIntoView(anchor: string) {
    const navItem = document.querySelector<HTMLElement>(`[data-anchor="${anchor}"]`);
    navItem?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}
