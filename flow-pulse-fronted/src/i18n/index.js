import zhCN from './zhCN';

export function t(key, ...args) {
  const template = zhCN[key] || key;
  return args.reduce((text, arg, index) => text.replaceAll(`{${index}}`, String(arg)), template);
}
