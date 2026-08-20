import apiClient from "./client";

export const fetchMobileServices = (type) =>
  apiClient
    .get("/mobile/services", { params: type ? { type } : {} })
    .then((res) => res.data.services);

export const fetchMobileForfaits = (serviceId) =>
  apiClient
    .get("/mobile/forfaits", { params: { serviceId } })
    .then((res) => res.data.forfaits);

// Lets the confirm dialog show the real total (base amount + admin-
// configured fee + TVA) before charging anything - same fee resolution
// createTopup/createBillPayment use server-side, so this never shows a
// number different from what's actually charged.
export const fetchMobileFeeQuote = (params) =>
  apiClient.get("/mobile/fee-quote", { params }).then((res) => res.data);

export const detectOperator = (phone) =>
  apiClient
    .get("/mobile/detect-operator", { params: { phone } })
    .then((res) => res.data.service);

export const createTopup = (serviceId, phoneNumber, amount) =>
  apiClient
    .post("/mobile/topup", { serviceId, phoneNumber, amount })
    .then((res) => res.data.transaction);

export const createForfaitTopup = (forfaitId, phoneNumber) =>
  apiClient
    .post("/mobile/topup", { forfaitId, phoneNumber })
    .then((res) => res.data.transaction);

export const createBillPayment = (serviceId, accountNumber, amount) =>
  apiClient
    .post("/mobile/bill-payment", { serviceId, accountNumber, amount })
    .then((res) => res.data.transaction);

export const fetchMyMobileTransactions = () =>
  apiClient.get("/mobile/transactions").then((res) => res.data.transactions);
