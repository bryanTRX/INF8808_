import pandas as pd
import plotly.express as px

# 1. Load the dataset
df = pd.read_csv('src/dataset.csv')
top_n = 50

# 2. Filter to the top_n genres based on median popularity
top_n_genres = df.groupby('track_genre')['popularity'].median().nlargest(top_n).index
df_top_n = df[df['track_genre'].isin(top_n_genres)].copy()

# 3. Create the popularity tiers (X-axis)
tier_labels = ['0-19', '20-39', '40-59', '60-79', '80-100']
df_top_n['popularity_tier'] = pd.cut(
    df_top_n['popularity'], 
    bins=[-1, 19, 39, 59, 79, 100], 
    labels=tier_labels
)

# 4. Create categorical bins for audio features (color/stacks)
df_top_n['Valence Category'] = pd.cut(
    df_top_n['valence'], 
    bins=[-0.01, 0.33, 0.66, 1.0], 
    labels=['Sad/Angry (Low)', 'Neutral (Medium)', 'Happy/Upbeat (High)']
)

df_top_n['Instrumental Category'] = pd.cut(
    df_top_n['instrumentalness'],
    bins=[-0.01, 0.1, 0.8, 1.0],
    labels=['Vocal-Heavy', 'Mixed', 'Instrumental']
)

# 5. Create the 100% Stacked Bar Chart
fig = px.histogram(
    df_top_n,
    x="popularity_tier",
    color="Valence Category",
    barnorm="percent",
    category_orders={"popularity_tier": ['0-19', '20-39', '40-59', '60-79', '80-100']}, 
    title="The Anatomy of a Hit: Valence Breakdown Across Popularity Tiers (Top 50 Genres)",
    labels={
        'popularity_tier': 'Popularity Tier (0-100)', 
        'Valence Category': 'Valence (Mood)'
    },
    color_discrete_map={
        'Sad/Angry (Low)': '#636EFA',      
        'Neutral (Medium)': '#BEC1D4',     
        'Happy/Upbeat (High)': '#EF553B'   
    }
)

fig.update_layout(
    yaxis_title="Percentage of Tracks (%)",
    xaxis_title="Popularity Tier",
    barmode="stack",
    hovermode="x unified" # Groups the hover tooltips together for easier comparison
)

# Display the figures
fig.show()