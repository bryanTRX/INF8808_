// Shared genre family definitions — used by viz01, viz03 and any future chart
// that needs to group Spotify genre tags into broader families.

export interface GenreFamily {
  key: string;
  en: string;
  color: string;
  keywords: string[]; // max 15 Spotify tag fragments (normalized, no hyphens/spaces)
}

export const GENRE_FAMILIES: GenreFamily[] = [
  {
    key: 'rock-metal',
    en: 'Rock / Metal',
    color: '#e05252',
    keywords: ['rock', 'metal', 'punk', 'hardcore', 'alternative', 'grunge', 'emo', 'heavymetal', 'blackmetal', 'deathmetal', 'progressiverock', 'garage', 'shoegaze', 'postpunk', 'noise'],
  },
  {
    key: 'pop',
    en: 'Pop',
    color: '#4e9af1',
    keywords: ['pop', 'kpop', 'jpop', 'dancepop', 'synthpop', 'electropop', 'powerpop', 'indiepop', 'cantopop', 'teenpop', 'bedroompop', 'artpop', 'bubblegum', 'poprock', 'mandopop'],
  },
  {
    key: 'electronic',
    en: 'Electronic / Dance',
    color: '#a855f7',
    keywords: ['edm', 'house', 'techno', 'trance', 'dubstep', 'drumandbass', 'electronic', 'electronica', 'club', 'dance', 'electro', 'breakbeat', 'dnb', 'footwork', 'disco'],
  },
  {
    key: 'hip-hop',
    en: 'Hip-hop / Rap',
    color: '#f59e0b',
    keywords: ['hiphop', 'rap', 'trap', 'drill', 'grime', 'consciouship', 'gangsterrap', 'undergroundhip', 'cloudrap', 'mumble', 'crunk', 'bounce', 'phonk', 'lofihiphop', 'horrorcore'],
  },
  {
    key: 'classical',
    en: 'Classical / Instrumental',
    color: '#10b981',
    keywords: ['classical', 'opera', 'piano', 'orchestra', 'chamber', 'baroque', 'romantic', 'avantgarde', 'symphony', 'string', 'choral', 'concerto', 'renaissance', 'minimalism', 'neoclassical'],
  },
  {
    key: 'folk',
    en: 'Folk / Acoustic',
    color: '#65a30d',
    keywords: ['folk', 'acoustic', 'singersongwriter', 'country', 'bluegrass', 'americana', 'celtic', 'traditional', 'stomp', 'altcountry', 'newamericana', 'cowboy', 'roots', 'western', 'outlaw'],
  },
  {
    key: 'latin-world',
    en: 'Latin / World',
    color: '#f97316',
    keywords: ['latin', 'salsa', 'cumbia', 'bachata', 'bossanova', 'samba', 'flamenco', 'afrobeat', 'reggae', 'ska', 'world', 'dancehall', 'sertanejo', 'pagode', 'tropicalia'],
  },
  {
    key: 'jazz-blues',
    en: 'Jazz / Blues',
    color: '#0891b2',
    keywords: ['jazz', 'blues', 'bebop', 'swing', 'cooljazz', 'smoothjazz', 'gospel', 'souljazz', 'chicagoblues', 'deltablues', 'electricblues', 'fusion', 'acidjazz', 'hardbop', 'freejazz'],
  },
  {
    key: 'rnb-soul',
    en: 'R&B / Soul',
    color: '#ec4899',
    keywords: ['rnb', 'soul', 'funk', 'neosoul', 'motown', 'quietstorm', 'phillysoul', 'southernsoul', 'doowop', 'groove', 'funkrock', 'blueeyedsoul', 'contemporaryrnb', 'newjack', 'gogo'],
  },
  {
    key: 'ambient',
    en: 'Ambient / Chill',
    color: '#64748b',
    keywords: ['ambient', 'chill', 'newage', 'sleep', 'meditation', 'lofi', 'study', 'postrock', 'drone', 'atmospheric', 'space', 'downtempo', 'triphop', 'chillout', 'darkambient'],
  },
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s_\-]+/g, '');
}

/** Returns the matching GenreFamily for a Spotify genre tag, or null. */
export function assignGenreFamily(genreTag: string): GenreFamily | null {
  const norm = normalize(genreTag);
  for (const fam of GENRE_FAMILIES) {
    for (const kw of fam.keywords) {
      if (norm === kw || norm.includes(kw) || kw.includes(norm)) {
        return fam;
      }
    }
  }
  return null;
}
