import type { Lang } from '../core/services/lang.service';

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
  lead: 'Every stream on Spotify leaves behind a trail of numbers, like danceability, energy, tempo, loudness, and more. This dashboard turns those audio features into a story: how genres differ is illustrated in the first four visualizations, what correlates with popularity is shown in the fifth to ninth graphs, and the biggest artists profiles are presented in the tenth visualization.',
  bridge: 'Scroll through ten interactive chapters, or jump to any section from the sidebar. Hover charts for details and use filters where available.',
};

export const VIZ_CATALOG: VizEntry[] = [
  {
    id: 1,
    anchor: 'viz-1',
    title: 'Parallel Genres Coordinates',
    subtitle: 'Average audio features for top genre families',
    source: 'viz-1 (Plotly → D3)',
    chapter: 'Chapter 01 — The genre fingerprint',
    narrative: 'In this first visualization, each colored line represents a genre family that zigzags across multiple axes representing features. Genre families that rise and fall together share a similar profile.',
    insight: 'Some clusters of lines move in sync across the axes. There are four categories : Classical / Instrumental and Ambient / Chill; Folk / Acoustic and Jazz / Blues; Pop, Latin / World and R&B / Soul; Electronic / Dance, Rock / Metal and Hip‑hop / Rap. That pattern reveals genre families that sound alike in the data, even when their names seem unrelated.',
    readingGuide: 'Hover over a line to see its details. Toggle families on and off using the legend checkboxes to isolate the ones you want to compare.',
  },
  {
    id: 2,
    anchor: 'viz-2',
    title: 'Duration Box Plot per Genres',
    subtitle: 'Track duration distribution across genre families',
    source: 'viz-2 (Plotly → D3)',
    chapter: 'Chapter 02 — How long is a song?',
    narrative: 'Song length is one of the quietest conventions in music, because listeners rarely notice it. These box plots show the full distribution of track durations across ten genre families. The dashed reference line marks the median duration for the Electronic family as a baseline for comparison.',
    insight: 'Out of the 4 categories of genres identified in the last visualization, only 2 have consistent durations : first Classical / Instrumental and Ambient / Chill; then second Pop, Latin / World and R&B / Soul. The largest boxes of Electronic and Jazz indicate that many different track lengths are common. Folk, Rock and Hip-Hop have less diversity and their boxes are narrower.',
    readingGuide: 'Compare each family\'s median (center line) and spread (box height) against the Electronic reference line. Sort ascending or descending to find the longest and shortest genres.',
  },
  {
    id: 3,
    anchor: 'viz-3',
    title: 'Explicit vs Clean',
    subtitle: '100% stacked bars by genre family',
    source: 'viz-3',
    chapter: 'Chapter 03 — Lyrics and lines',
    narrative: 'These 100% stacked bars show the proportion of explicit versus clean tracks for each genre family.',
    insight: 'A genre family with more of one color could indicate a trend around its content. The category previously identified of Electronic / Dance, Rock / Metal and Hip‑hop / Rap have a high percentage of explicit tracks. R&B / Soul also has a high percentage of them, while genres that are almost entirely clean tend to be instrumental.',
    readingGuide: 'Hover a segment to see the exact percentage. Sort by explicit share to rank families from most to least explicit.',
  },
  {
    id: 4,
    anchor: 'viz-5',
    title: 'Tempo vs Danceability',
    subtitle: 'Faceted scatter by genre',
    source: 'viz-5',
    chapter: 'Chapter 04 — The dance-floor equation',
    narrative: 'Tempo sets the pace, and danceability captures how easy a track is to move to. Each small multiple in this faceted scatter plot focuses on one genre, with a sample of tracks and a regression line tracing the local trend.',
    insight: 'Surprisingly, it seems like a higher tempo results in a lower danceability in most genres. Only Classical and Jazz music show the opposite trend, where faster songs in that genre also tend to feel more danceable.',
    readingGuide: 'Toggle genres using the chips to isolate them. A steep slope means tempo and danceability are tightly linked',
  },
  {
    id: 5,
    anchor: 'viz-4',
    title: 'Popularity Correlation',
    subtitle: 'Feature Correlation with Popularity',
    source: 'viz-4',
    chapter: 'Chapter 05 — What popularity listens for',
    narrative: 'This chart asks an important question of the dataset: which audio qualities move alongside Spotify popularity? Each bar represents one feature, scored by how strongly it correlates with a track\'s popularity score.',
    insight: 'A positive bar means more of that feature tends to accompany higher popularity, while a negative bar indicates the opposite. In both views, Loudness and Danceability are the top 2 features that correlate positively with popularity, while Instrumentalness and Speechiness are the top 2 features that correlate negatively with it.',
    readingGuide: 'Switch between Pearson (linear relationship) and Spearman (rank-based) to identify features that hold their position in both views.',
  },
  {
    id: 6,
    anchor: 'viz-6',
    title: 'Acousticness vs Popularity',
    subtitle: 'Pop vs Rock comparison',
    source: 'viz-6',
    chapter: 'Chapter 06 — The link between acousticness and popularity',
    narrative: 'Acousticness measures how unplugged a recording sounds, while dense electronic production scores low. This chapter puts Pop and Rock side by side, using regression lines and binned mean curves to reveal how acousticness relates to popularity in each genre.',
    insight: 'The slope is almost flat, so the relationship between acousticness and popularity is weak in both genres. However, Pop and Rock show opposite trends. Up until around 0.8 acousticness, more acoustic tracks in Pop tend to be more popular, while in Rock, more acoustic tracks tend to be less popular. There is an opposite trend in the last 20% of the acoustic range.',
    readingGuide: 'A rising slope of the lines means more acoustic tracks tend to be more popular in that genre; a falling slope means the opposite.',
  },
  {
    id: 7,
    anchor: 'viz-7',
    title: 'Duration vs Popularity',
    subtitle: 'Average popularity by 30-second duration bins',
    source: 'viz-7',
    chapter: 'Chapter 07 — The sweet time range',
    narrative: 'The attention spans are falling, and a question can be raised: is there an ideal song length? Tracks are grouped into 30-second duration windows and each bar shows the average popularity within that window.',
    insight: 'Unsurprisingly, the three-to-five minute range is the most popular, as a lot of known hits fall into that range. The popularity sharply drops for shorter tracks than 1 minute 30 seconds, but is surprisingly high for tracks longer than 5 minutes.',
    readingGuide: 'Hover any bar to see the average popularity and track count for that duration range. The dashed line marks the overall dataset average for quick comparison.',
  },
  {
    id: 8,
    anchor: 'viz-8',
    title: 'Popularity Composition',
    subtitle: 'Stacked bars by popularity tier',
    source: 'viz-8 (Plotly → D3)',
    chapter: 'Chapter 08 — Tiers of success',
    narrative: 'Tracks are split into five popularity tiers, and each tier is broken down by an audio feature of your choice. The stacked bars reveal what each tier sounds like. Are the biggest hits higher energy? More danceable?',
    insight: 'In the two most popular tiers, there is a lower proportion of Sad/Angry valence, low danceability and low energy. The most popular tracks are more vocal. There is no clear pattern between Speechiness and Popularity.',
    readingGuide: 'Select a feature using the buttons at the top, and the shading shows the proportion falling in each tiered bin.',
  },
  {
    id: 9,
    anchor: 'viz-9',
    title: 'Heatmaps trends',
    subtitle: '2D feature density plots',
    source: 'viz-9 (Plotly → D3)',
    chapter: 'Chapter 09 — Where the crowd gathers',
    narrative: 'While scatter plots show individual tracks, density heatmaps show where they concentrate. The brightest cells define the typical Spotify track. The darker edges represent unusual combinations. Marginal histograms on each edge show the individual distributions.',
    insight: 'Energy and Loudness seem to increase together. Speechiness and Danceability do not show a clear relationship, but the most common tracks are low Speechiness.',
    readingGuide: 'Toggle between Energy/Loudness and Speechiness/Danceability to explore two distinct views of the dataset.',
  },
  {
    id: 10,
    anchor: 'viz-10',
    title: 'Artist Dashboard',
    subtitle: 'Radar profiles for the top 12 performers',
    source: 'viz-10',
    chapter: 'Chapter 10 — Faces in the data',
    narrative: 'This last visualization focuses on individual artists. The top twelve performers are displayed as a grid of small radar charts, with each one a polygon summarizing that artist\'s audio profile across eight dimensions. Click any card to add or remove that artist from the large comparison radar below, where their shapes overlap for direct comparison.',
    insight: 'A part of the polygons overlap in the lower-left quadrant. Besides high popularity, all artists have a similar high loudness and tempo. The acousticness and duration is rather low for all artists. However, the radar charts also reveal substantial differences in danceability, energy and valence. Some charts have shapes similar to a bow‑tie, with lower duration and acousticness in the middle. Others differ greatly and the upper‑right quadrant varies significantly across artists.',
    readingGuide: 'Hover a mini card to see exact values. Click cards to toggle artists in the comparison radar.',
  },
];

export function getStoryPrologue(_lang: Lang) {
  return STORY_PROLOGUE;
}

export function getVizCatalog(_lang: Lang): VizEntry[] {
  return VIZ_CATALOG;
}