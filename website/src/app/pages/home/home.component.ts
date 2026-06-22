import { Component } from '@angular/core';
import { APP_STRINGS } from '../../core/i18n/app-strings';
import { STORY_PROLOGUE, VIZ_CATALOG } from '../../viz-shared/viz-catalog';
import { VizChapterComponent } from '../../viz-shared/viz-chapter/viz-chapter.component';
import { Viz01Component } from '../viz01/component';
import { Viz02Component } from '../viz02/component';
import { Viz03Component } from '../viz03/component';
import { Viz04Component } from '../viz04/component';
import { Viz05Component } from '../viz05/component';
import { Viz06Component } from '../viz06/component';
import { Viz07Component } from '../viz07/component';
import { Viz08Component } from '../viz08/component';
import { Viz09Component } from '../viz09/component';
import { Viz10Component } from '../viz10/component';

@Component({
  selector: 'app-home',
  imports: [
    VizChapterComponent,
    Viz01Component,
    Viz02Component,
    Viz03Component,
    Viz04Component,
    Viz05Component,
    Viz06Component,
    Viz07Component,
    Viz08Component,
    Viz09Component,
    Viz10Component,
  ],
  template: `
    <section id="dashboard" class="story-prologue">
      <p class="prologue-eyebrow">{{ prologue.eyebrow }}</p>
      <h1>{{ prologue.title }}</h1>
      <p class="prologue-lead">{{ prologue.lead }}</p>
      <p class="prologue-bridge">{{ prologue.bridge }}</p>
    </section>

    <div id="viz-1" class="viz-scroll-target">
      <app-viz-chapter [entry]="catalog[0]" />
      <app-viz01 />
    </div>
    <div id="viz-2" class="viz-scroll-target">
      <app-viz-chapter [entry]="catalog[1]" />
      <app-viz02 />
    </div>
    <div id="viz-3" class="viz-scroll-target">
      <app-viz-chapter [entry]="catalog[2]" />
      <app-viz03 />
    </div>
    <div id="viz-5" class="viz-scroll-target">
      <app-viz-chapter [entry]="catalog[3]" />
      <app-viz05 />
    </div>
    <div id="viz-4" class="viz-scroll-target">
      <app-viz-chapter [entry]="catalog[4]" />
      <app-viz04/>
    </div>
    <div id="viz-6" class="viz-scroll-target">
      <app-viz-chapter [entry]="catalog[5]" />
      <app-viz06 />
    </div>
    <div id="viz-7" class="viz-scroll-target">
      <app-viz-chapter [entry]="catalog[6]" />
      <app-viz07 />
    </div>
    <div id="viz-8" class="viz-scroll-target">
      <app-viz-chapter [entry]="catalog[7]" />
      <app-viz08 />
    </div>
    <div id="viz-9" class="viz-scroll-target">
      <app-viz-chapter [entry]="catalog[8]" />
      <app-viz09 />
    </div>
    <div id="viz-10" class="viz-scroll-target">
      <app-viz-chapter [entry]="catalog[9]" />
      <app-viz10 />
    </div>
    <footer class="story-epilogue">
      <p class="epilogue-eyebrow">{{ strings.epilogueEyebrow }}</p>
      <h2>{{ strings.epilogueTitle }}</h2>
      <p>{{ strings.epilogueBody }}</p>
    </footer>
  `,
  styles: [`
    .story-prologue,
    .story-epilogue {
      max-width: 760px;
      margin: 0 auto 2.5rem;
    }

    .prologue-eyebrow,
    .epilogue-eyebrow {
      margin: 0 0 0.5rem;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--accent);
    }

    .story-prologue h1,
    .story-epilogue h2 {
      margin: 0 0 1rem;
      font-size: clamp(1.75rem, 3.5vw, 2.35rem);
      font-weight: 700;
      letter-spacing: -0.03em;
      line-height: 1.15;
    }

    .prologue-lead,
    .story-epilogue p {
      margin: 0 0 1rem;
      color: var(--text-secondary);
      font-size: 1.05rem;
      line-height: 1.75;
    }

    .prologue-bridge {
      margin: 0 0 2rem;
      padding-left: 1rem;
      border-left: 3px solid var(--accent);
      color: var(--text-secondary);
      font-size: 0.95rem;
      line-height: 1.65;
      font-style: italic;
    }

    .story-epilogue {
      padding: 2rem 0 3rem;
      border-top: 1px solid var(--border);
      text-align: center;
    }

    .story-epilogue p {
      max-width: 620px;
      margin: 0 auto;
    }
  `],
})
export class HomeComponent {
  readonly catalog = VIZ_CATALOG;
  readonly prologue = STORY_PROLOGUE;
  readonly strings = APP_STRINGS;
}
