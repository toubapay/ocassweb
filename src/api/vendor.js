import apiClient from "./client";

export const fetchStores = (params = {}) =>
  apiClient.get("/vendor/stores", { params }).then((res) => res.data.stores);

export const fetchStoreBySlug = (slug) =>
  apiClient.get(`/vendor/stores/${slug}`).then((res) => res.data.store);

export const fetchMyStore = () =>
  apiClient.get("/vendor/store").then((res) => res.data.store);
export const createStore = (payload) =>
  apiClient.post("/vendor/store", payload).then((res) => res.data.store);
export const updateStore = (payload) =>
  apiClient.patch("/vendor/store", payload).then((res) => res.data.store);

export const fetchMyProducts = () =>
  apiClient.get("/vendor/products").then((res) => res.data.products);
export const createProduct = (payload) =>
  apiClient.post("/vendor/products", payload).then((res) => res.data.product);
export const updateProduct = (id, payload) =>
  apiClient.patch(`/vendor/products/${id}`, payload).then((res) => res.data.product);
export const deactivateProduct = (id) =>
  apiClient.delete(`/vendor/products/${id}`).then((res) => res.data.product);

export const fetchMyVendorOrders = () =>
  apiClient.get("/vendor/orders").then((res) => res.data.orders);
export const updateVendorOrderStatus = (id, status) =>
  apiClient.patch(`/vendor/orders/${id}/status`, { status }).then((res) => res.data.order);

// The shop's own view of the courier runs it raised, and of what it kept
// after commission (see listMyDeliveries / getMyEarnings).
export const fetchMyVendorDeliveries = () =>
  apiClient.get("/vendor/deliveries").then((res) => res.data.deliveries);
export const fetchMyVendorEarnings = () =>
  apiClient.get("/vendor/earnings").then((res) => res.data);
