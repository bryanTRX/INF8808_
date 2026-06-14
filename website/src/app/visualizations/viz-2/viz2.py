import pandas as pd
import plotly.express as px
import plotly.graph_objects as go


# 1. Load the dataset
df = pd.read_csv('src/dataset.csv')
top_n = 50

# 2. Convert duration from milliseconds to minutes for human readability
df['duration_min'] = df['duration_ms'] / 60000

# 3. Identify the Top 20 genres (based on median popularity to ensure relevance)
top_n_genres = df.groupby('track_genre')['popularity'].median().nlargest(50).index
df_top_n = df[df['track_genre'].isin(top_n_genres)]

# 4. Calculate the exact median duration of the 'pop' genre for our reference line
pop_median_duration = df[df['track_genre'] == 'pop']['duration_min'].median()

# 5. Create the Box Plot
fig_duration = px.box(
    df_top_n,
    x="track_genre",
    y="duration_min",
    color="track_genre",
    title=f"Structural Norms: Track Duration Across Top 50 Genres",
    labels={'track_genre': 'Music Genre', 'duration_min': 'Duration (Minutes)'}
)

fig_duration.add_hline(
    y=pop_median_duration, 
    line_dash="dash", 
    line_color="red", 
    annotation_text=f"Pop Median: {pop_median_duration:.2f} min", 
    annotation_position="top right"
)

fig_duration.update_layout(
    yaxis=dict(range=[0, 10]),
    showlegend=False # Hide legend as X-axis labels are sufficient
)

# 5. Map the boolean 'explicit' column to cleaner text labels
df_top_n['content_type'] = df_top_n['explicit'].map({True: 'Explicit', False: 'Clean'})

# 6. Create the 100% Stacked Bar Chart
fig_explicit = px.histogram(
    df_top_n,
    x="track_genre",
    color="content_type",
    barnorm="percent",
    title="Content Divide: Percentage of Explicit vs. Clean Tracks",
    labels={'track_genre': 'Music Genre', 'content_type': 'Content Type'},
    color_discrete_map={'Explicit': '#EF553B', 'Clean': '#00CC96'} # Red for explicit, Green for clean
)

fig_explicit.update_layout(
    yaxis_title="Percentage (%)",
    barmode="stack"
)

# Display the figures
fig_duration.show()
fig_explicit.show()