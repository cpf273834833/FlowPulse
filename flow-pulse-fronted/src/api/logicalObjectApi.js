import { del, get, post, put } from './request';

const BASE = '/flowpulse/frontapi/v1/logical-objects';

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

export const logicalObjectApi = {
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
  resolve(id) {
    return post(`${BASE}/${id}/resolve`, {});
  },
  instances(id, query) {
    return get(`${BASE}/${id}/instances${params(query)}`);
  },
};
