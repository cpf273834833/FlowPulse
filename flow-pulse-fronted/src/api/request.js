import { t } from '../i18n';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json;charset=UTF-8',
};

export async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      ...DEFAULT_HEADERS,
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(payload.message || t('requestFailedWithStatus', response.status));
  }
  if (payload.code && payload.code !== 200) {
    throw new Error(payload.message || t('requestFailed'));
  }
  return payload.data;
}

export function get(url) {
  return request(url, { method: 'GET' });
}

export function post(url, data) {
  return request(url, { method: 'POST', body: JSON.stringify(data || {}) });
}

export function put(url, data) {
  return request(url, { method: 'PUT', body: JSON.stringify(data || {}) });
}

export function del(url) {
  return request(url, { method: 'DELETE' });
}
