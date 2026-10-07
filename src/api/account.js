import apiClient from "./client";

// Saved delivery addresses. Nothing wrote Order.deliveryAddressId before
// these existed, which is why a vendor handing an order to the couriers
// was always refused for want of a dropoff point (see
// server/src/modules/account/address.controller.js).
export const fetchAddresses = () =>
  apiClient.get("/account/addresses").then((res) => res.data.addresses);
export const createAddress = (payload) =>
  apiClient.post("/account/addresses", payload).then((res) => res.data.address);
export const updateAddress = (id, payload) =>
  apiClient.patch(`/account/addresses/${id}`, payload).then((res) => res.data.address);
export const deleteAddress = (id) =>
  apiClient.delete(`/account/addresses/${id}`).then((res) => res.data);
