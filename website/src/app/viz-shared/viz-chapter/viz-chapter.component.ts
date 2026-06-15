import { Component, Input, computed, inject } from '@angular/core';
import { appStrings } from '../../core/i18n/app-strings';
import { LangService } from '../../core/services/lang.service';
import { VizEntry } from '../viz-catalog';

@Component({
  selector: 'app-viz-chapter',
  template: `
    <article class="viz-chapter">
      <p class="chapter-eyebrow">{{ entry.chapter }}</p>
      <h2 class="chapter-title">{{ entry.title }}</h2>
      <p class="chapter-narrative">{{ entry.narrative }}</p>
      <div class="chapter-callouts">
        <div class="callout insight">
          <span class="callout-label">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2a7 7 0 0 1 3.5 13.07V17a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-1.93A7 7 0 0 1 12 2zm2 17H10v1a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-1z"/>
            </svg>
            {{ strings().chapterInsight }}
          </span>
          <p>{{ entry.insight }}</p>
        </div>
        <div class="callout guide">
          <span class="callout-label">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            {{ strings().chapterGuide }}
          </span>
          <p>{{ entry.readingGuide }}</p>
        </div>
      </div>
    </article>
  `,
})
export class VizChapterComponent {
  @Input({ required: true }) entry!: VizEntry;

  private readonly langService = inject(LangService);
  readonly strings = computed(() => appStrings(this.langService.lang()));
}
