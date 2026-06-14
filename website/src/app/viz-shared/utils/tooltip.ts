import * as d3 from 'd3';

export interface VizTooltip {
  show: (event: MouseEvent, html: string) => void;
  move: (event: MouseEvent) => void;
  hide: () => void;
  destroy: () => void;
}

export function createTooltip(className = 'd3-tip'): VizTooltip {
  const tip = d3.select('body').append('div').attr('class', className).style('display', 'none');
  const position = (event: MouseEvent) => {
    const padding = 14, offset = 16;
    const node = tip.node();
    if (!node) return;
    let x = event.clientX + offset, y = event.clientY + offset;
    const bounds = node.getBoundingClientRect();
    if (x + bounds.width > window.innerWidth - padding) x = event.clientX - bounds.width - offset;
    if (y + bounds.height > window.innerHeight - padding) y = event.clientY - bounds.height - offset;
    tip.style('left', `${Math.max(padding, x)}px`).style('top', `${Math.max(padding, y)}px`);
  };
  return {
    show(event, html) { tip.html(html).style('display', 'block').classed('is-visible', true); position(event); },
    move: position,
    hide() { tip.classed('is-visible', false).style('display', 'none'); },
    destroy() { tip.remove(); },
  };
}
