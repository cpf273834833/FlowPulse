import { del, get, post, put } from './request';

const BASE = '/flowpulse/frontapi/v1/environment-region';

export const environmentRegionApi = {
  page() {
    return get(`${BASE}/page`);
  },
  createEnvironment(data) {
    return post(`${BASE}/environments`, data);
  },
  updateEnvironment(id, data) {
    return put(`${BASE}/environments/${id}`, data);
  },
  deleteEnvironment(id) {
    return del(`${BASE}/environments/${id}`);
  },
  createRegion(data) {
    return post(`${BASE}/regions`, data);
  },
  updateRegion(id, data) {
    return put(`${BASE}/regions/${id}`, data);
  },
  deleteRegion(id) {
    return del(`${BASE}/regions/${id}`);
  },
  savePlatformConfig(data) {
    return post(`${BASE}/platform-configs`, data);
  },
  deletePlatformConfig(id) {
    return del(`${BASE}/platform-configs/${id}`);
  },
};
