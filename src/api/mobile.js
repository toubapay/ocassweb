import apiClient from "./client";

export const fetchMobileServices = (type) =>
  apiClient
    .get("/mobile/services", { params: type ? { type } : {} })
    .then((res) => res.data.services);

export const detectOperator = (phone) =>
  apiClient
    .get("/mobile/detect-operator", { params: { phone } })
    .then((res) => res.data.service);

export const createTopup = (serviceId, phoneNumber, amount) =>
  apiClient
    .post("/mobile/topup", { serviceId, phoneNumber, amount })
    .then((res) => res.data.transaction);

export const createBillPayment = (serviceId, accountNumber, amount) =>
  apiClient
    .post("/mobile/bill-payment", { serviceId, accountNumber, amount })
    .then((res) => res.data.transaction);

export const fetchMyMobileTransactions = () =>
  apiClient.get("/mobile/transactions").then((res) => res.data.transactions);
