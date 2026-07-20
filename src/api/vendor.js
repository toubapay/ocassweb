import apiClient from "./client";

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
