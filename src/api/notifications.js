import apiClient from "./client";

export const fetchNotifications = () =>
  apiClient.get("/notifications").then((res) => res.data.notifications);
export const fetchUnreadCount = () =>
  apiClient.get("/notifications/unread-count").then((res) => res.data.count);
export const markNotificationRead = (id) =>
  apiClient.patch(`/notifications/${id}/read`).then((res) => res.data);
export const markAllNotificationsRead = () =>
  apiClient.patch("/notifications/read-all").then((res) => res.data);
