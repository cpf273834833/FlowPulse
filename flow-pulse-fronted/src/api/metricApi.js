import { del, get, post, put } from './request';

const BASE = '/flowpulse/frontapi/v1/metrics';

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

export const metricApi = {
  page(query) {
    return get(`${BASE}/page${params(query)}`);
  },
  applicable(query) {
    return get(`${BASE}/applicable${params(query)}`);
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
  implementationPage(query) {
    return get(`${BASE}/implementations/page${params(query)}`);
  },
  implementationDetail(id) {
    return get(`${BASE}/implementations/${id}`);
  },
  createImplementation(data) {
    return post(`${BASE}/implementations`, data);
  },
  updateImplementation(id, data) {
    return put(`${BASE}/implementations/${id}`, data);
  },
  deleteImplementation(id) {
    return del(`${BASE}/implementations/${id}`);
  },
  resourceConfigPage(query) {
    return get(`${BASE}/resource-configs/page${params(query)}`);
  },
  resourceConfigLatestSamples(id) {
    return get(`${BASE}/resource-configs/${id}/samples/latest`);
  },
  createResourceConfig(data) {
    return post(`${BASE}/resource-configs`, data);
  },
  updateResourceConfig(id, data) {
    return put(`${BASE}/resource-configs/${id}`, data);
  },
  deleteResourceConfig(id) {
    return del(`${BASE}/resource-configs/${id}`);
  },
};
