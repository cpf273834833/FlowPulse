import { del, get, post, put } from './request';

const BASE = '/flowpulse/frontapi/v1/executor-nodes';

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

export const executorNodeApi = {
  page(query) {
    return get(`${BASE}/page${params(query)}`);
  },
  detail(id) {
    return get(`${BASE}/${id}`);
  },
  create(data) {
    return post(BASE, data);
  },
  update(id, data) {
    return put(`${BASE}/${id}`, data);
  },
  delete(id) {
    return del(`${BASE}/${id}`);
  },
  test(id) {
    return post(`${BASE}/${id}/test`);
  },
  syncFromOmp(regionId) {
    return post(`${BASE}/sync-from-omp${params({ regionId })}`);
  },
};
