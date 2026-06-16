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
    subtitle: 'Average audio features for top genre families',
    source: 'viz-1 (Plotly → D3)',
    chapter: 'Chapter 01 — The genre fingerprint',
    narrative: 'Before comparing individual tracks, we need a map of the musical world. Each colored line represents a genre family — its average danceability, energy, acousticness, valence, tempo, and more connected across multiple axes. Genre families that rise and fall together share a sonic personality. Sharp zigzags reveal what makes each family distinct.',
    insight: 'Look for clusters of lines that move in sync across the axes. That pattern reveals genre families that sound alike in the data, even when their names seem unrelated.',
    readingGuide: 'Trace a single colored line from left to right. Toggle families on and off using the legend checkboxes to isolate the ones you want to compare.',
  },
  {
    id: 2,
    anchor: 'viz-2',
    title: 'Duration Box Plot',
    subtitle: 'Track duration distribution across genre families',
    source: 'viz-2 (Plotly → D3)',
    chapter: 'Chapter 02 — How long is a song?',
    narrative: 'Song length is one of the quietest conventions in music — listeners rarely notice it, but producers feel its pressure. These box plots show the full distribution of track durations across ten genre families, from tight radio singles to sprawling album cuts. The dashed reference line marks the median duration for the Pop family as a baseline for comparison.',
    insight: 'A wide box means a genre family tolerates many different track lengths. A narrow box suggests artists within that family have settled on a clear standard.',
    readingGuide: 'Compare each family\'s median (center line) and spread (box height) against the Pop reference line. Sort ascending or descending to find the longest and shortest genres.',
  },
  {
    id: 3,
    anchor: 'viz-3',
    title: 'Explicit vs Clean',
    subtitle: '100% stacked bars by genre family',
    source: 'viz-3',
    chapter: 'Chapter 03 — Lyrics, labels, and lines',
    narrative: 'The explicit content marker is not just a parental advisory sticker — it reflects how a genre presents itself to its audience. These 100% stacked bars show the proportion of explicit versus clean tracks for each genre family. The split reveals cultural norms, listener demographics, and platform positioning as much as individual artist decisions.',
    insight: 'A genre family dominated by one color signals a strong cultural identity around content. Genres that are almost entirely clean tend to be instrumental, international pop, or youth-oriented.',
    readingGuide: 'Read each bar as a proportion adding up to 100%. Hover a segment to see the exact percentage. Sort by explicit share to rank families from most to least explicit.',
  },
  {
    id: 4,
    anchor: 'viz-4',
    title: 'Feature Correlation',
    subtitle: 'Pearson / Spearman vs popularity',
    source: 'viz-4',
    chapter: 'Chapter 04 — What popularity listens for',
    narrative: 'This chart asks the central question of the dataset: which audio qualities move alongside Spotify popularity? Each bar represents one feature — danceability, energy, loudness, speechiness, and more — scored by how strongly it correlates with a track\'s popularity score. Switch between Pearson (linear relationship) and Spearman (rank-based) to test how robust each pattern really is.',
    insight: 'A positive bar means more of that feature tends to accompany higher popularity. Features that score high in both Pearson and Spearman are the most reliable indicators.',
    readingGuide: 'Start with Pearson to see the overall direction, then switch to Spearman. Features that hold their position in both views are the most trustworthy signals.',
  },
  {
    id: 5,
    anchor: 'viz-5',
    title: 'Tempo vs Danceability',
    subtitle: 'Faceted scatter by genre',
    source: 'viz-5',
    chapter: 'Chapter 05 — The dance-floor equation',
    narrative: 'Tempo sets the pace, and danceability captures how easy a track is to move to. Together they describe the physics of groove. Each panel in this faceted scatter plot focuses on one genre, with a sample of tracks and a regression line tracing the local trend. Toggle genre panels on and off to narrow your focus.',
    insight: 'A steep upward regression slope means that faster songs in that genre also tend to feel more danceable. That relationship does not hold equally across all genres.',
    readingGuide: 'Compare regression lines across panels — a steep slope means tempo and danceability are tightly linked in that genre. Toggle genres using the chips to isolate the pairs you want to study.',
  },
  {
    id: 6,
    anchor: 'viz-6',
    title: 'Acousticness vs Popularity',
    subtitle: 'Pop vs Rock comparison',
    source: 'viz-6',
    chapter: 'Chapter 06 — Acoustic versus amplified',
    narrative: 'Acousticness measures how unplugged a recording sounds — sparse guitar and room ambience score high, while dense electronic production scores low. This chapter puts Pop and Rock side by side, using regression lines and binned mean curves to reveal whether a more organic, acoustic sound helps or hurts popularity in each genre.',
    insight: 'If the regression slopes differ noticeably between Pop and Rock, it means the same sonic choice carries a different meaning depending on which genre you are in.',
    readingGuide: 'Look at the dashed regression line and the solid binned mean in each panel. A rising slope means more acoustic tracks tend to be more popular in that genre; a falling slope means the opposite.',
  },
  {
    id: 7,
    anchor: 'viz-7',
    title: 'Duration vs Popularity',
    subtitle: 'Average popularity by 30-second duration bins',
    source: 'viz-7',
    chapter: 'Chapter 07 — The sweet spot',
    narrative: 'Radio formats, playlist attention spans, and streaming skip rates all raise the same question: is there an ideal song length? Tracks are grouped into 30-second duration windows and each bar shows the average popularity within that window. Scroll to the three-to-five minute range to see where hits tend to cluster.',
    insight: 'Popularity does not rise steadily with duration. There is a clear peak zone — tracks outside it, whether very short or very long, tend to score lower on average.',
    readingGuide: 'Hover any bar to see the exact average popularity and track count for that duration range. The dashed line marks the overall dataset average for quick comparison.',
  },
  {
    id: 8,
    anchor: 'viz-8',
    title: 'Popularity Composition',
    subtitle: 'Stacked bars by popularity tier',
    source: 'viz-8 (Plotly → D3)',
    chapter: 'Chapter 08 — Tiers of success',
    narrative: 'Not every popular song is popular in the same way. Tracks are split into five popularity tiers — from emerging to chart-dominating — and each tier is broken down by an audio feature of your choice. The stacked bars reveal what each tier sounds like. Are the biggest hits higher energy? More danceable? The answer changes depending on which feature you select.',
    insight: 'Switch between features to see whether the composition shifts across tiers. A feature that stays evenly distributed is less predictive of success than one that concentrates at the top.',
    readingGuide: 'Select a feature using the buttons at the top. Then read the stacked bars left to right — each column is one popularity tier, and the shading shows the proportion falling in each category.',
  },
  {
    id: 9,
    anchor: 'viz-9',
    title: 'Density Heatmaps',
    subtitle: '2D feature density plots',
    source: 'viz-9 (Plotly → D3)',
    chapter: 'Chapter 09 — Where the crowd gathers',
    narrative: 'While scatter plots show individual tracks, density heatmaps show where they concentrate. These 50×50 grids reveal which combinations of two audio features are most common across the catalog. Bright cells are the sonic mainstream; dark corners hold rare combinations. Marginal histograms on each edge show the individual distributions. Toggle between Energy/Loudness and Speechiness/Danceability to explore two distinct views of the dataset.',
    insight: 'The brightest cells define the typical Spotify track. The darker edges represent unusual combinations — genre experiments or niche styles.',
    readingGuide: 'Switch between the two modes using the buttons. Look for diagonal bands of high density, which reveal features that tend to increase or decrease together.',
  },
  {
    id: 10,
    anchor: 'viz-10',
    title: 'Artist Dashboard',
    subtitle: 'Radar profiles for the top 12 performers',
    source: 'viz-10',
    chapter: 'Chapter 10 — Faces in the data',
    narrative: 'We close by zooming from genres to individual artists. The top twelve performers are displayed as a grid of small radar charts — each one a polygon summarizing that artist\'s average audio profile across eight dimensions. Click any card to add or remove that artist from the large comparison radar below, where their shapes overlap for direct comparison.',
    insight: 'Artists with overlapping radar shapes share a similar sonic identity, even if they belong to different genres. Shapes that differ dramatically explain why two equally popular artists can sound nothing alike.',
    readingGuide: 'Hover a mini card to see exact values. Click cards to toggle artists in the comparison radar. The more artists you select, the richer the overlap — start with three and add one at a time.',
  },
];

export function getStoryPrologue(lang: Lang) {
  return lang === 'fr' ? STORY_PROLOGUE_FR : STORY_PROLOGUE;
}

export function getVizCatalog(lang: Lang): VizEntry[] {
  return lang === 'fr' ? VIZ_CATALOG_FR : VIZ_CATALOG;
}
