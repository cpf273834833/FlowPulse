const THEME_ATTRIBUTE = 'data-flowpulse-theme';

function inferTheme() {
  const root = document.documentElement;
  const body = document.body;
  const text = `${root.className || ''} ${body.className || ''}`.toLowerCase();
  if (text.indexOf('light') >= 0) {
    return 'light';
  }
  return 'dark';
}

export function bindPlatformTheme() {
  const apply = () => {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, inferTheme());
  };
  apply();
  const observer = new MutationObserver(apply);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });
  window.addEventListener('storage', apply);
  return () => {
    observer.disconnect();
    window.removeEventListener('storage', apply);
  };
}
