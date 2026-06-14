import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import * as d3 from 'd3';
import { Observable, map, shareReplay } from 'rxjs';
import { TrackRow } from '../models/track-row';

@Injectable({ providedIn: 'root' })
export class VizDataService {
  private readonly http = inject(HttpClient);
  private dataset$?: Observable<TrackRow[]>;

  loadDataset(): Observable<TrackRow[]> {
    if (!this.dataset$) {
      this.dataset$ = this.http.get('/assets/dataset.csv', { responseType: 'text' }).pipe(
        map((text) => d3.csvParse(text, d3.autoType) as TrackRow[]),
        shareReplay(1),
      );
    }
    return this.dataset$;
  }

  loadTopPerformers(): Observable<{ rank: number; name: string }[]> {
    return this.http.get<{ rank: number; name: string }[]>('/assets/top-12-performers.json');
  }
}
