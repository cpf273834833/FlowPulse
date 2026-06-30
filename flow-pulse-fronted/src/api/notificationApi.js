import { del, get, post, put } from './request';

const BASE = '/flowpulse/frontapi/v1/notification-channels';

export const notificationApi = {
  list() {
    return get(BASE);
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
};
