const THEME_ATTRIBUTE = 'data-flowpulse-theme';

const PORTAL_TOKENS = [
  '--primary-color', '--link-color', '--page-bg', '--body-background',
  '--component-background', '--navigation-bg', '--header-bg', '--light-bg',
  '--divider-bg', '--divider-color', '--border-color', '--text-color',
  '--text-color-secondary', '--text-color-thridly', '--heading-color',
  '--table-color', '--black-card', '--deep-card', '--deep-background',
  '--disabled-bg', '--disabled-color', '--active-color', '--success-color',
  '--warning-color', '--error-color', '--box-shadow-base', '--shadow-deep',
];

function platformDocument() {
  try {
    if (window.parent && window.parent !== window && window.parent.document) {
      return window.parent.document;
    }
  } catch (error) {
    // Cross-origin embedding falls back to FlowPulse's own document and palette.
  }
  return document;
}

function inferTheme(sourceDocument) {
  if (sourceDocument === document) {
    const previewTheme = new URLSearchParams(window.location.search).get('theme') || window.localStorage.getItem('flowpulse-theme-preview');
    if (previewTheme === 'light' || previewTheme === 'dark') return previewTheme;
  }
  const root = sourceDocument.documentElement;
  const body = sourceDocument.body;
  const marker = `${root.className || ''} ${body?.className || ''}`.toLowerCase();
  if (marker.includes('white') || marker.includes('light')) return 'light';
  if (marker.includes('blue') || marker.includes('dark')) return 'dark';
  if (sourceDocument === document && ['localhost', '127.0.0.1'].includes(window.location.hostname)) return 'light';
  return 'dark';
}

function copyPortalTokens(sourceDocument) {
  const sourceWindow = sourceDocument.defaultView;
  if (!sourceWindow) return;
  const sourceRoot = sourceDocument.documentElement;
  const sourceBody = sourceDocument.body || sourceRoot;
  const rootStyle = sourceWindow.getComputedStyle(sourceRoot);
  const bodyStyle = sourceWindow.getComputedStyle(sourceBody);
  const target = document.documentElement;

  PORTAL_TOKENS.forEach((name) => {
    const value = rootStyle.getPropertyValue(name).trim() || bodyStyle.getPropertyValue(name).trim();
    if (value) target.style.setProperty(name, value);
  });
}

export function bindPlatformTheme() {
  const sourceDocument = platformDocument();
  const apply = () => {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, inferTheme(sourceDocument));
    copyPortalTokens(sourceDocument);
  };

  apply();
  const observer = new MutationObserver(apply);
  [sourceDocument.documentElement, sourceDocument.body].filter(Boolean).forEach((node) => {
    observer.observe(node, { attributes: true, attributeFilter: ['class', 'style'] });
  });
  window.addEventListener('storage', apply);

  return () => {
    observer.disconnect();
    window.removeEventListener('storage', apply);
  };
}
