import type { Lang } from '../core/services/lang.service';
import { STORY_PROLOGUE_FR, VIZ_CATALOG_FR } from './catalog.fr';

export interface VizEntry {
  id: number;
  anchor: string;
  title: string;
  subtitle: string;
  source: string;
  chapter: string;
  narrative: string;
  insight: string;
  readingGuide: string;
}

export const STORY_PROLOGUE = {
  eyebrow: 'A guided tour',
  title: 'What does a hit song actually sound like?',
  lead: 'Every stream on Spotify leaves behind a trail of numbers — danceability, energy, tempo, loudness, and more. This dashboard turns those audio features into a story: how genres differ, what correlates with popularity, and where the biggest artists sit in the landscape.',
  bridge: 'Scroll through ten interactive chapters, or jump to any section from the sidebar. Hover charts for details, use filters where available, and follow the thread from the big picture down to individual artists.',
};

export const VIZ_CATALOG: VizEntry[] = [
  {
    id: 1,
    anchor: 'viz-1',
    title: 'Parallel Coordinates',
    subtitle: 'Average audio features for top genres',
    source: 'viz-1 (Plotly → D3)',
    chapter: 'Chapter 01 — The genre fingerprint',
    narrative: 'Before we compare individual tracks, we need a map of the musical world. Each line in this parallel-coordinates plot is a genre — danceability, energy, acousticness, valence, and popularity drawn as connected points across five axes. Genres that rise and fall together share a sonic personality; sharp zigzags reveal idiosyncrasy.',
    insight: 'Look for clusters of lines moving in sync: that is evidence of genres that “sound alike” in the data, even when their names sound worlds apart.',
    readingGuide: 'Trace a single colored line across all axes. Compare how pop, rock, and electronic genres trade energy for acousticness.',
  },
  {
    id: 2,
    anchor: 'viz-2',
    title: 'Duration Box Plot',
    subtitle: 'Track duration norms across top genres',
    source: 'viz-2 (Plotly → D3)',
    chapter: 'Chapter 02 — How long is a song?',
    narrative: 'Song length is one of the quietest conventions in music — listeners rarely notice it, but producers feel its pressure. These box plots show how long tracks run in each of the top 50 genres, from short punchy singles to sprawling album cuts. The dashed reference line marks the median duration for pop, our baseline for “typical.”',
    insight: 'Wide boxes mean a genre tolerates many lengths; narrow boxes mean artists converge on a formula.',
    readingGuide: 'Compare each genre’s median (center line) and spread (box height) against the pop reference. Which genres consistently run longer than a standard hit?',
  },
  {
    id: 3,
    anchor: 'viz-3',
    title: 'Explicit vs Clean',
    subtitle: '100% stacked bars by genre',
    source: 'viz-3',
    chapter: 'Chapter 03 — Lyrics, labels, and lines',
    narrative: 'Explicit content is not just a parental-advisory sticker — it is a structural feature of how genres present themselves. These stacked bars show, for each genre, what share of tracks are marked explicit versus clean. The split reflects culture, audience, and platform norms as much as individual artist choice.',
    insight: 'Genres dominated by one color are telling you about their audience and release strategy, not just their vocabulary.',
    readingGuide: 'Read each bar as a proportion out of 100%. Hover to see exact percentages and notice which genres lean heavily explicit.',
  },
  {
    id: 4,
    anchor: 'viz-4',
    title: 'Feature Correlation',
    subtitle: 'Pearson/Spearman vs popularity',
    source: 'viz-4',
    chapter: 'Chapter 04 — What popularity listens for',
    narrative: 'Here we ask the dataset’s central question: which measurable qualities move with Spotify popularity? Each bar is an audio feature — danceability, energy, speechiness, and more — scored by how strongly it correlates with a track’s popularity score. Toggle between Pearson (linear) and Spearman (rank-based) to see whether relationships hold under different assumptions.',
    insight: 'A positive bar means “more of this tends to mean more popular.” Strength matters as much as direction — weak correlations still shape the average hit.',
    readingGuide: 'Start with Pearson, then switch to Spearman. Features that stay important in both views are the most reliable signals.',
  },
  {
    id: 5,
    anchor: 'viz-5',
    title: 'Tempo vs Danceability',
    subtitle: 'Faceted scatter by genre',
    source: 'viz-5',
    chapter: 'Chapter 05 — The dance-floor equation',
    narrative: 'Tempo sets the pulse; danceability captures how easy a track is to move to. Together they describe the physics of groove. These faceted scatter plots sample tracks from major genres, each panel with its own cloud of points and a regression line showing the local trend. Filter genres, adjust sample size, or search for a specific artist to see where they land.',
    insight: 'A steep upward slope means faster songs in that genre also tend to feel more danceable — not every genre obeys that rule.',
    readingGuide: 'Pick two genres and compare their regression lines side by side. Use the search box to pin a favorite artist inside the cloud.',
  },
  {
    id: 6,
    anchor: 'viz-6',
    title: 'Acousticness vs Popularity',
    subtitle: 'Pop vs Rock comparison',
    source: 'viz-6',
    chapter: 'Chapter 06 — Acoustic versus amplified',
    narrative: 'Acousticness measures how “unplugged” a recording sounds — sparse guitars and room ambience score high; dense production scores low. This chapter pits Pop against Rock in a head-to-head comparison, with regression lines and binned averages showing whether quieter, more organic sounds help or hurt popularity in each camp.',
    insight: 'If the regression slopes differ between Pop and Rock, the same sonic choice means something different depending on the genre.',
    readingGuide: 'Read the stat cards for Pearson r and mean popularity in low- vs high-acoustic tracks, then confirm the pattern in the scatter.',
  },
  {
    id: 7,
    anchor: 'viz-7',
    title: 'Duration vs Popularity',
    subtitle: 'Binned duration-popularity trends',
    source: 'viz-7',
    chapter: 'Chapter 07 — The sweet spot',
    narrative: 'Radio formats, playlist attention spans, and streaming skip rates all whisper the same question: is there an ideal song length? Tracks are grouped into 30-second bins by duration; each bar’s height is the average popularity in that window. Brush the chart or use the quick-range buttons to zoom into the three-to-five-minute band where hits often cluster.',
    insight: 'The headline answer updates live from the data — watch how the “sweet spot” shifts when you change the visible range.',
    readingGuide: 'Hover bars for exact averages, toggle song counts to see sample size, and try the 3–5 min focus to compare against the full catalog.',
  },
  {
    id: 8,
    anchor: 'viz-8',
    title: 'Popularity Composition',
    subtitle: 'Stacked bars by popularity tier',
    source: 'viz-8 (Plotly → D3)',
    chapter: 'Chapter 08 — Tiers of success',
    narrative: 'Not every popular song is popular in the same way. Genres are split into popularity tiers — from emerging tracks to chart dominators — then broken down by an audio feature you choose. The result is a stacked portrait of what each tier sounds like within a genre: do breakthrough hits have more energy than deep-catalog favorites?',
    insight: 'Switch the feature buttons to see whether success at different tiers is built on danceability, valence, acousticness, or something else.',
    readingGuide: 'Pick a feature, then read each stack left to right as low-to-high popularity tiers within a genre.',
  },
  {
    id: 9,
    anchor: 'viz-9',
    title: 'Density Heatmaps',
    subtitle: '2D feature density plots',
    source: 'viz-9 (Plotly → D3)',
    chapter: 'Chapter 09 — Where the crowd gathers',
    narrative: 'Scatter plots show points; heatmaps show gravity. These 50×50 density grids reveal where tracks pile up in feature space — bright cells are sonic common ground, dark corners are rare combinations. Marginal histograms along each axis show the underlying distributions. Switch between Energy/Loudness and Speechiness/Danceability to explore two different “maps” of the catalog.',
    insight: 'Hot spots are the default sound of the dataset; outliers in the cool edges are the experiments and exceptions.',
    readingGuide: 'Toggle modes and look for diagonal hot bands — they signal features that rise and fall together across thousands of tracks.',
  },
  {
    id: 10,
    anchor: 'viz-10',
    title: 'Artist Dashboard',
    subtitle: 'Radar profiles and trend lines',
    source: 'viz-10',
    chapter: 'Chapter 10 — Faces in the data',
    narrative: 'We close by zooming from genres to names. The top twelve performers each get a radar profile — a shape summarizing their average audio character — and a trend panel tracing how a chosen metric evolves across their discography ordered by popularity. Select artists, switch metrics, and compare signatures side by side.',
    insight: 'Radar shapes that overlap belong to artists with similar sonic identities; diverging shapes explain why two equally popular stars can feel nothing alike.',
    readingGuide: 'Check three artists at once on the radar, then change the trend metric to see whether their success follows duration, energy, or another thread.',
  },
];

export function getStoryPrologue(lang: Lang) {
  return lang === 'fr' ? STORY_PROLOGUE_FR : STORY_PROLOGUE;
}

export function getVizCatalog(lang: Lang): VizEntry[] {
  return lang === 'fr' ? VIZ_CATALOG_FR : VIZ_CATALOG;
}
