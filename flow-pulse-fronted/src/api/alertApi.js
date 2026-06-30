import { get, post } from './request';

const BASE = '/flowpulse/frontapi/v1/alerts';

function params(query = {}) {
  const search = new URLSearchParams();
  Object.keys(query).forEach((key) => {
    if (query[key] !== undefined && query[key] !== null && query[key] !== '') {
      search.append(key, query[key]);
    }
  });
  const value = search.toString();
  return value ? `?${value}` : '';
}

export const alertApi = {
  page(query) {
    return get(`${BASE}/page${params(query)}`);
  },
  detail(id) {
    return get(`${BASE}/${id}`);
  },
  acknowledge(id, operator = 'admin') {
    return post(`${BASE}/${id}/acknowledge${params({ operator })}`, {});
  },
};
