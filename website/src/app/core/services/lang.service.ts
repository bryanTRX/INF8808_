import { Injectable, signal } from '@angular/core';

export type Lang = 'fr' | 'en';

@Injectable({ providedIn: 'root' })
export class LangService {
  readonly lang = signal<Lang>('en');

  toggle(): void {}

  setLang(_lang: Lang): void {}
}
