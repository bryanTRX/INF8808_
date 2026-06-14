import pandas as pd
import plotly.express as px


# 1. Load the dataset
df = pd.read_csv('src/dataset.csv')
top_n = 50

# 2. Get top_n most popular genres (based on median popularity)
top_genres = df.groupby('track_genre')['popularity'].median().nlargest(top_n).index
df_top = df[df['track_genre'].isin(top_genres)]

# 3. Calculate average audio features per genre
genre_avg = df_top.groupby('track_genre')[
    ['danceability', 'energy', 'acousticness', 'valence', 'popularity']
].mean().reset_index()

genre_avg['genre_id'] = range(len(genre_avg))

# 4. Create Parallel Coordinates Plot
fig = px.parallel_coordinates(
    genre_avg, 
    color="genre_id",
    dimensions=['danceability', 'energy', 'acousticness', 'valence', 'popularity'],
    title=f"Average Audio Features for {top_n} Genres",
    color_continuous_scale=px.colors.diverging.Tealrose
)

# Display the figures
fig.update_layout(coloraxis_showscale=False)
fig.show()