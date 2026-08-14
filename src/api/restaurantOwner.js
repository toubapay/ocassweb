import apiClient from "./client";

export const fetchMyRestaurant = () =>
  apiClient.get("/restaurants/owner/restaurant").then((res) => res.data.restaurant);
export const createMyRestaurant = (payload) =>
  apiClient.post("/restaurants/owner/restaurant", payload).then((res) => res.data.restaurant);
export const updateMyRestaurant = (payload) =>
  apiClient.patch("/restaurants/owner/restaurant", payload).then((res) => res.data.restaurant);

export const fetchMyMenuItems = () =>
  apiClient.get("/restaurants/owner/menu-items").then((res) => res.data.menuItems);
export const createMenuItem = (payload) =>
  apiClient.post("/restaurants/owner/menu-items", payload).then((res) => res.data.menuItem);
export const updateMenuItem = (id, payload) =>
  apiClient.patch(`/restaurants/owner/menu-items/${id}`, payload).then((res) => res.data.menuItem);
export const deactivateMenuItem = (id) =>
  apiClient.delete(`/restaurants/owner/menu-items/${id}`).then((res) => res.data.menuItem);

export const fetchMyRestaurantOrders = () =>
  apiClient.get("/restaurants/owner/orders").then((res) => res.data.orders);
export const updateRestaurantOrderStatus = (id, status) =>
  apiClient.patch(`/restaurants/owner/orders/${id}/status`, { status }).then((res) => res.data.order);
