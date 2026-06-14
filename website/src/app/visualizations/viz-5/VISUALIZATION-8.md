# Visualization 8

This visualization tests whether faster tracks are systematically more danceable in every major genre family. It targets this question:

**Does higher tempo strictly equate to higher danceability across all genres?**

## Description

This section uses an interactive **faceted scatter plot**: one small multiple per broad genre family (Pop, Rock, Hip-Hop, Electronic, Dance, Latin, and others derived from Spotify `track_genre` tags). Each facet plots **tempo (BPM)** on the horizontal axis and **danceability** (0–1) on the vertical axis. Individual tracks appear as semi-transparent points; a dashed **linear regression line** and **Pearson r** summarize the direction and strength of the relationship within that genre.

By default, six genre families are shown in a 3×2 grid with **shared scales** enabled so slopes and cloud shapes can be compared fairly. The side panel lists Pearson correlations and slopes for every selected genre, sorted from strongest to weakest. A short note reminds the reader what a *strict* tempo → danceability rule would look like: **r ≈ 1** and similar **positive** slopes in every facet.

The chart loads `../dataset.csv` from the Project folder. Genre families are assigned by mapping semicolon-separated sub-genres to twelve broad buckets (for example `alt-rock` → Rock, `house` → Electronic).

**Why we chose this approach.** The question asks about a **rule that holds everywhere**, not a single global average. One pooled scatter plot would hide genre-specific behaviour and overstate agreement when clusters differ. Faceting by genre makes contradictions visible: some families can show a mild positive trend while others show flat or negative slopes, and vertical spread at a given tempo shows that danceability is not determined by BPM alone. Regression lines and **r** turn each facet into a measurable test of “strict equivalence.” Shared axes prevent misleading comparisons when one genre’s tempo range is narrower than another’s. Sampling keeps ~90k points responsive while preserving the overall cloud shape.

## Interactions

Checking or unchecking a genre in the side panel adds or removes its facet and updates the correlation summary.

The **points per facet** slider subsamples tracks for performance while keeping the regression computed on the full genre subset.

The **shared tempo & danceability scales** checkbox toggles between comparable axes across facets (default) and per-genre auto-scales for zooming into local spread.

Hovering a point shows the track title, artist, genre, popularity, tempo, and danceability.

The search box highlights matching tracks (larger, opaque points) and dims the rest, useful for locating examples that break the tempo–danceability intuition.

**Reset** restores the default six genres, sample size, shared scales, and clears the search.

## Preview

![Tempo versus danceability faceted scatter plot](preview-tempo-danceability.png)

*Figure 9. Tempo versus danceability by genre family (faceted scatter plot with regression lines)*

With shared scales and the default genre selection, the clouds are **wide and overlapping**, not tight diagonal bands. Regression **r** values stay **well below 1** (often weakly negative for Pop, Rock, Electronic, Dance, and Latin in this dataset). Slopes are small and not uniformly positive: faster tempos do **not** map to higher danceability in a consistent way. Latin and Dance show substantial danceability at moderate tempos, while many Rock and Metal-tagged tracks sit at high tempo with low danceability—clear counterexamples to a strict rule.

Jazz and Classical facets (when enabled) can show a **slightly positive** r, but the correlation remains modest and the points still span most of the danceability range. That means even where tempo and danceability move together a little, the link is far too weak to call tempo a universal proxy for danceability.

**Conclusion for the research question:** Higher tempo does **not** strictly equate to higher danceability across all genres. Tempo explains only a small fraction of danceability within each family, genres disagree on direction and strength, and many high-tempo tracks remain low on danceability. Danceability appears to depend on other production and style factors beyond BPM alone.
