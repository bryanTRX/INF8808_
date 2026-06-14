import pandas as pd
import plotly.express as px

# 1. Load the dataset
df = pd.read_csv('src/dataset.csv')
top_n = 50

# 2. Create 2D Density Heatmap
fig_energy_loudness = px.density_heatmap(
    df, 
    x="energy", 
    y="loudness", 
    title="Audio Correlation: The Density of Energy vs. Loudness (All Tracks)",
    labels={
        'energy': 'Energy Level (0.0 to 1.0)', 
        'loudness': 'Loudness (Decibels)'
    },
    color_continuous_scale=px.colors.sequential.Viridis, 
    nbinsx=50, 
    nbinsy=50, 
    marginal_x="histogram",
    marginal_y="histogram" 
)

fig_energy_loudness.update_layout(
    coloraxis_colorbar=dict(title="Track Count"),
    hovermode="closest"
)

fig_speech_dance = px.density_heatmap(
    df, 
    x="speechiness", 
    y="danceability", 
    title="Vocal Rhythm: The Density of Speechiness vs. Danceability (All Tracks)",
    labels={
        'speechiness': 'Speechiness Level (0.0 to 1.0)', 
        'danceability': 'Danceability Score (0.0 to 1.0)'
    },
    color_continuous_scale=px.colors.sequential.Plasma, 
    nbinsx=50, 
    nbinsy=50, 
    marginal_x="histogram",
    marginal_y="histogram"
)

fig_speech_dance.update_layout(
    coloraxis_colorbar=dict(title="Track Count"),
    hovermode="closest"
)

# Display the figures
fig_energy_loudness.show()
fig_speech_dance.show()