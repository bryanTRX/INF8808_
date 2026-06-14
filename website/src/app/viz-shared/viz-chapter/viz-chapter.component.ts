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
          <span class="callout-label">{{ strings().chapterInsight }}</span>
          <p>{{ entry.insight }}</p>
        </div>
        <div class="callout guide">
          <span class="callout-label">{{ strings().chapterGuide }}</span>
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
