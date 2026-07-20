import apiClient from "./client";

export const fetchWallet = () => apiClient.get("/wallet").then((res) => res.data.wallet);

export const fetchWalletTransactions = () =>
  apiClient.get("/wallet/transactions").then((res) => res.data.transactions);

export const topUpWallet = (amount) =>
  apiClient.post("/wallet/topup", { amount }).then((res) => res.data);
