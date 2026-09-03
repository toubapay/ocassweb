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

// Per-service fees & TVA
export const fetchAdminServiceFees = (moduleKey) =>
  apiClient.get("/admin/service-fees", { params: { moduleKey } }).then((res) => res.data.services);
export const upsertAdminServiceFee = (payload) =>
  apiClient.put("/admin/service-fees", payload).then((res) => res.data.config);

// Vendors
export const fetchAdminVendors = (params) =>
  apiClient.get("/admin/vendors", { params }).then((res) => res.data);
export const updateAdminVendorStore = (id, payload) =>
  apiClient.patch(`/admin/vendors/${id}`, payload).then((res) => res.data.store);

// Restaurants
export const fetchAdminRestaurants = (params) =>
  apiClient.get("/admin/restaurants", { params }).then((res) => res.data);
export const updateAdminRestaurant = (id, payload) =>
  apiClient.patch(`/admin/restaurants/${id}`, payload).then((res) => res.data.restaurant);

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

// Categories
export const fetchAdminCategories = () =>
  apiClient.get("/admin/categories").then((res) => res.data.categories);
export const createAdminCategory = (payload) =>
  apiClient.post("/admin/categories", payload).then((res) => res.data.category);
export const updateAdminCategory = (id, payload) =>
  apiClient.patch(`/admin/categories/${id}`, payload).then((res) => res.data.category);

// Delivery package types
export const fetchAdminDeliveryPackageTypes = () =>
  apiClient.get("/admin/delivery-package-types").then((res) => res.data.packageTypes);
export const createAdminDeliveryPackageType = (payload) =>
  apiClient.post("/admin/delivery-package-types", payload).then((res) => res.data.packageType);
export const updateAdminDeliveryPackageType = (id, payload) =>
  apiClient.patch(`/admin/delivery-package-types/${id}`, payload).then((res) => res.data.packageType);
export const deleteAdminDeliveryPackageType = (id) =>
  apiClient.delete(`/admin/delivery-package-types/${id}`);

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

export const fetchAdminMobileForfaits = (serviceId) =>
  apiClient
    .get("/admin/services/mobile-forfaits", { params: serviceId ? { serviceId } : {} })
    .then((res) => res.data.forfaits);
export const createAdminMobileForfait = (payload) =>
  apiClient.post("/admin/services/mobile-forfaits", payload).then((res) => res.data.forfait);
export const updateAdminMobileForfait = (id, payload) =>
  apiClient
    .patch(`/admin/services/mobile-forfaits/${id}`, payload)
    .then((res) => res.data.forfait);

export const fetchAdminInsurancePlans = () =>
  apiClient.get("/admin/services/insurance").then((res) => res.data.plans);
export const createAdminInsurancePlan = (payload) =>
  apiClient.post("/admin/services/insurance", payload).then((res) => res.data.plan);
export const updateAdminInsurancePlan = (id, payload) =>
  apiClient.patch(`/admin/services/insurance/${id}`, payload).then((res) => res.data.plan);

export const fetchAdminAutoInsurancePolicies = (status) =>
  apiClient
    .get("/admin/insurance/auto-policies", { params: status ? { status } : undefined })
    .then((res) => res.data.policies);

// Flash sales
export const fetchAdminFlashSales = () =>
  apiClient.get("/admin/flash-sales").then((res) => res.data.flashSales);
export const createAdminFlashSale = (payload) =>
  apiClient.post("/admin/flash-sales", payload).then((res) => res.data.flashSale);
export const updateAdminFlashSale = (id, payload) =>
  apiClient.patch(`/admin/flash-sales/${id}`, payload).then((res) => res.data.flashSale);
export const deleteAdminFlashSale = (id) => apiClient.delete(`/admin/flash-sales/${id}`);
