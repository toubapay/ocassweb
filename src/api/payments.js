import apiClient from "./client";

export const fetchPaymentStatus = (token) =>
  apiClient.get(`/payments/paydunya/status/${token}`).then((res) => res.data.payment);
