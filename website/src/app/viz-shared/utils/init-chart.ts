/** Defer chart render until the container has layout dimensions. */
export function deferChartInit(callback: () => void): void {
  requestAnimationFrame(() => requestAnimationFrame(callback));
}
