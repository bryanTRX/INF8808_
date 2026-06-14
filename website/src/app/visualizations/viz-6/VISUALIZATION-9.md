# Visualization 9

This visualization compares how acoustic production relates to streaming popularity in the two genre families named in the question. It targets:

**9. How does the relationship between acousticness and popularity differ between Pop and Rock?**

## Description

This section uses a **side-by-side comparative scatter plot** with one panel for **Pop** and one for **Rock**. Each panel plots **acousticness** (0–1) on the horizontal axis and **Spotify popularity** (0–100) on the vertical axis. Tracks appear as semi-transparent points coloured by genre (blue for Pop, red for Rock). Two overlays summarize the relationship:

- a dashed **linear regression line** with **Pearson r** (overall linear trend);
- a solid **binned mean line** (average popularity within acousticness bins), which can reveal non-linear patterns that a single slope might miss.

**Shared scales** are enabled by default so the two clouds and slopes can be compared on the same acousticness and popularity ranges. The side panel reports each genre’s correlation, slope, mean popularity in low- vs high-acousticness bands, and a short text summary of how Pop and Rock differ.

Tracks are assigned to Pop or Rock by mapping semicolon-separated `track_genre` tags (same broad buckets as the course scatter plot: tags containing `pop` → Pop, tags containing `rock` → Rock). The chart loads `../dataset.csv` from the Project folder.

**Why we chose this approach.** Question 9 is explicitly **comparative** between two genres, not a single pooled trend. Overlaying Pop and Rock in one scatter would blend thousands of points and obscure genre-specific structure. Juxtaposed panels with **identical axes** make differences in slope, correlation, and vertical spread immediately visible. Reporting **r** and **slope** quantifies whether acousticness is linked to popularity the same way in both families. The **binned mean** line complements regression because popularity may peak in a mid-acousticness band (for example highly produced Pop) rather than rising monotonically. Mean popularity in low- and high-acousticness subsets gives a simple readable contrast even when the linear fit is weak.

## Interactions

The **points per genre** slider subsamples drawn points for responsiveness; regression and binned means still use the full Pop or Rock subset.

The **shared acousticness & popularity scales** checkbox toggles between fair cross-genre comparison (default) and per-panel auto-scales for inspecting local detail.

Hovering a point shows the track title, artist, sub-genre tags, acousticness, and popularity.

The search box highlights matching tracks and dims others, useful for finding high-popularity acoustic outliers (for example unplugged or singer-songwriter hits).

**Reset** restores the default sample size, shared scales, and clears the search.

## Preview

![Acousticness versus popularity for Pop and Rock](preview-acoustic-popularity.png)

*Figure 10. Acousticness versus popularity: Pop (left) and Rock (right) with regression and binned mean trends*

With shared scales, **Pop** typically shows a **dense cluster at low acousticness** (highly produced catalog) with many mid-to-high popularity tracks, while more acoustic Pop songs (right side of the panel) are fewer and often sit in a **wider vertical spread** without dominating the top popularity band. The regression line for Pop is often **flat or weakly sloped**, with a small **r**, suggesting acousticness alone does not drive mainstream Pop success in this dataset.

**Rock** fills more of the acousticness range, including a visible share of **high-acousticness** tracks (acoustic rock, folk-rock, unplugged material). The Rock cloud often extends to **lower popularity** at both low and high acousticness, and the binned mean may dip or flatten at very high acousticness compared with Pop. Regression for Rock can differ in **slope** and **r** from Pop: when Rock’s slope is negative or nearer zero while Pop’s is slightly positive (or the reverse), the genres **do not share the same acousticness–popularity trade-off**.

**Conclusion for question 9:** The relationship **differs** between Pop and Rock. Pop’s hits concentrate in **low-acousticness, high-production** territory; acousticness is not a strong linear predictor of popularity within Pop. Rock spans more acoustic material and shows a **distinct** popularity distribution across acousticness levels—often with weaker top-end popularity for very acoustic tracks. Users should compare panels side by side (and the Δr / slope summary) rather than assume one rule applies to both genres.
