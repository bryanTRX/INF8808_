export function observeResize(container: HTMLElement, callback: () => void, debounceMs = 150): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const onResize = () => { clearTimeout(timer); timer = setTimeout(callback, debounceMs); };
  const observer = new ResizeObserver(onResize);
  observer.observe(container);
  window.addEventListener('resize', onResize);
  return () => { clearTimeout(timer); observer.disconnect(); window.removeEventListener('resize', onResize); };
}
