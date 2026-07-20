import apiClient from "./client";

export const fetchAvailablePostings = () =>
  apiClient.get("/anando/postings/available").then((res) => res.data.postings);
export const fetchMyPostings = () =>
  apiClient.get("/anando/postings/mine").then((res) => res.data.postings);
export const fetchMyBookings = () =>
  apiClient.get("/anando/bookings/mine").then((res) => res.data.bookings);

export const createPosting = (payload) =>
  apiClient.post("/anando/postings", payload).then((res) => res.data.posting);
export const cancelPosting = (id) =>
  apiClient.patch(`/anando/postings/${id}/cancel`).then((res) => res.data);
export const departPosting = (id) =>
  apiClient.post(`/anando/postings/${id}/depart`).then((res) => res.data.posting);

export const bookSeat = (postingId, payload) =>
  apiClient.post(`/anando/postings/${postingId}/book`, payload).then((res) => res.data);
export const cancelBooking = (id) =>
  apiClient.patch(`/anando/bookings/${id}/cancel`).then((res) => res.data);
