import { del, get, post, put } from './request';

const BASE = '/flowpulse/frontapi/v1/topologies';

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

export const topologyApi = {
  page(query) {
    return get(`${BASE}/page${params(query)}`);
  },
  detail(id) {
    return get(`${BASE}/${id}`);
  },
  runtime(id) {
    return get(`${BASE}/${id}/runtime`);
  },
  create(data) {
    return post(BASE, data);
  },
  update(id, data) {
    return put(`${BASE}/${id}`, data);
  },
  saveCanvas(id, data) {
    return put(`${BASE}/${id}/canvas`, data);
  },
  delete(id) {
    return del(`${BASE}/${id}`);
  },
};
