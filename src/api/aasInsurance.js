import apiClient from "./client";

// A.A.S "Assurance Digitale" auto insurance comparison/purchase - separate
// from the flat legacy /insurance/plans list (src/api/modules.js) since
// this is a real multi-step quote/pay/issue flow against a live provider,
// not a static catalog.
export const fetchAasMetadata = () => apiClient.get("/insurance/auto/metadata").then((res) => res.data);

export const compareAasQuotes = (payload) =>
  apiClient.post("/insurance/auto/compare", payload).then((res) => res.data);

export const fetchAasPolicies = () =>
  apiClient.get("/insurance/auto/policies").then((res) => res.data.policies);

export const fetchAasPolicy = (id) =>
  apiClient.get(`/insurance/auto/policies/${id}`).then((res) => res.data.policy);

export const purchaseAasPolicy = (payload) =>
  apiClient.post("/insurance/auto/policies", payload).then((res) => res.data);

export const retryAasPolicy = (id) =>
  apiClient.post(`/insurance/auto/policies/${id}/retry`).then((res) => res.data);

export const cancelAasPolicy = (id) =>
  apiClient.patch(`/insurance/auto/policies/${id}/cancel`).then((res) => res.data.policy);
