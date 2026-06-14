import * as d3 from 'd3';

export const CHART = {
  text: 'var(--text)',
  muted: 'var(--muted)',
  secondary: 'var(--text-secondary)',
  axis: 'var(--border-subtle)',
  grid: 'var(--border-subtle)',
  accent: 'var(--accent)',
};

export function styleAxis(
  axis: d3.Selection<SVGGElement, unknown, null, undefined>,
  fontSize = 11,
): void {
  axis.selectAll('text').attr('fill', CHART.muted).attr('font-size', fontSize);
  axis.selectAll('line, path').attr('stroke', CHART.axis);
}

export function drawGrid(
  parent: d3.Selection<SVGGElement, unknown, null, undefined>,
  scale: d3.ScaleLinear<number, number>,
  width: number,
): void {
  const grid = parent.append('g').attr('class', 'grid').attr('opacity', 0.5);
  grid
    .call(d3.axisLeft(scale).tickSize(-width).tickFormat(() => '') as never)
    .selectAll('line')
    .attr('stroke', CHART.grid);
  grid.select('.domain')?.remove();
}
