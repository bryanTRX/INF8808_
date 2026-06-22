import { Injectable, signal } from '@angular/core';

export type Lang = 'en';

@Injectable({ providedIn: 'root' })
export class LangService {
  readonly lang = signal<Lang>('en');
}
