export interface TrackRow {
  [key: string]: string | number | boolean | undefined;
  track_id?: string;
  track_name?: string;
  artists?: string;
  album_name?: string;
  popularity?: number;
  track_genre?: string;
  explicit?: boolean | string;
  danceability?: number;
  energy?: number;
  valence?: number;
  loudness?: number;
  tempo?: number;
  acousticness?: number;
  speechiness?: number;
  instrumentalness?: number;
  duration_ms?: number;
}
