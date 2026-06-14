export interface ChartTheme {
  text: string;
  textSecondary: string;
  muted: string;
  border: string;
  panel: string;
  accent: string;
  danger: string;
  reference: string;
  brushFill: string;
  brushStroke: string;
  bar: string;
  lineScale: [string, string, string];
}

function cssVar(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export function getChartTheme(): ChartTheme {
  return {
    text: cssVar('--chart-text', '#ffffff'),
    textSecondary: cssVar('--chart-text-secondary', '#b3b3b3'),
    muted: cssVar('--chart-muted', '#a3a3a3'),
    border: cssVar('--chart-border', '#404040'),
    panel: cssVar('--chart-panel', '#1e1e1e'),
    accent: cssVar('--accent', '#1db954'),
    danger: cssVar('--danger', '#f87171'),
    reference: cssVar('--chart-reference', '#f87171'),
    brushFill: cssVar('--chart-brush-fill', '#282828'),
    brushStroke: cssVar('--chart-brush-stroke', '#333333'),
    bar: cssVar('--chart-bar', '#1db954'),
    lineScale: [
      cssVar('--chart-line-a', '#1db954'),
      cssVar('--chart-line-b', '#b3b3b3'),
      cssVar('--chart-line-c', '#ff6b6b'),
    ],
  };
}
