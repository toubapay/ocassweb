import apiClient from "./client";

// Stats
export const fetchAdminStats = () =>
  apiClient.get("/admin/stats").then((res) => res.data);

// Users
export const fetchAdminUsers = (params) =>
  apiClient.get("/admin/users", { params }).then((res) => res.data);
export const updateAdminUser = (id, payload) =>
  apiClient.patch(`/admin/users/${id}`, payload).then((res) => res.data.user);

// Modules & fees
export const fetchAdminModules = () =>
  apiClient.get("/admin/modules").then((res) => res.data.modules);
export const updateAdminModule = (key, payload) =>
  apiClient.patch(`/admin/modules/${key}`, payload).then((res) => res.data.module);

// Vendors
export const fetchAdminVendors = (params) =>
  apiClient.get("/admin/vendors", { params }).then((res) => res.data);
export const updateAdminVendorStore = (id, payload) =>
  apiClient.patch(`/admin/vendors/${id}`, payload).then((res) => res.data.store);

// Service zones
export const fetchAdminZones = (moduleKey) =>
  apiClient
    .get("/admin/zones", { params: moduleKey ? { moduleKey } : {} })
    .then((res) => res.data.zones);
export const createAdminZone = (payload) =>
  apiClient.post("/admin/zones", payload).then((res) => res.data.zone);
export const updateAdminZone = (id, payload) =>
  apiClient.patch(`/admin/zones/${id}`, payload).then((res) => res.data.zone);
export const deleteAdminZone = (id) => apiClient.delete(`/admin/zones/${id}`);

// Providers
export const fetchAdminProviders = (category) =>
  apiClient
    .get("/admin/providers", { params: category ? { category } : {} })
    .then((res) => res.data.providers);
export const createAdminProvider = (payload) =>
  apiClient.post("/admin/providers", payload).then((res) => res.data.provider);
export const updateAdminProvider = (id, payload) =>
  apiClient.patch(`/admin/providers/${id}`, payload).then((res) => res.data.provider);
export const deleteAdminProvider = (id) => apiClient.delete(`/admin/providers/${id}`);

// Services catalog
export const fetchAdminMobileServices = () =>
  apiClient.get("/admin/services/mobile").then((res) => res.data.services);
export const createAdminMobileService = (payload) =>
  apiClient.post("/admin/services/mobile", payload).then((res) => res.data.service);
export const updateAdminMobileService = (id, payload) =>
  apiClient.patch(`/admin/services/mobile/${id}`, payload).then((res) => res.data.service);

export const fetchAdminInsurancePlans = () =>
  apiClient.get("/admin/services/insurance").then((res) => res.data.plans);
export const createAdminInsurancePlan = (payload) =>
  apiClient.post("/admin/services/insurance", payload).then((res) => res.data.plan);
export const updateAdminInsurancePlan = (id, payload) =>
  apiClient.patch(`/admin/services/insurance/${id}`, payload).then((res) => res.data.plan);
