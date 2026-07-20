import apiClient from "./client";

// Delivery
export const fetchDeliveryRequests = () =>
  apiClient.get("/delivery/requests").then((res) => res.data.requests);
export const createDeliveryRequest = (payload) =>
  apiClient.post("/delivery/requests", payload).then((res) => res.data.request);
export const cancelDeliveryRequest = (id) =>
  apiClient.patch(`/delivery/requests/${id}/cancel`).then((res) => res.data.request);

// Delivery agent dispatch
export const fetchAvailableDeliveryJobs = () =>
  apiClient.get("/delivery/jobs/available").then((res) => res.data.requests);
export const fetchMyDeliveryJobs = () =>
  apiClient.get("/delivery/jobs/mine").then((res) => res.data.requests);
export const acceptDeliveryJob = (id) =>
  apiClient.post(`/delivery/jobs/${id}/accept`).then((res) => res.data.request);
export const markDeliveryPickedUp = (id) =>
  apiClient.post(`/delivery/jobs/${id}/picked-up`).then((res) => res.data.request);
export const markDeliveryDelivered = (id) =>
  apiClient.post(`/delivery/jobs/${id}/delivered`).then((res) => res.data.request);

// Insurance
export const fetchInsurancePlans = (category) =>
  apiClient
    .get("/insurance/plans", { params: category ? { category } : {} })
    .then((res) => res.data.plans);
export const fetchInsurancePolicies = () =>
  apiClient.get("/insurance/policies").then((res) => res.data.policies);
export const subscribeInsurancePlan = (planId) =>
  apiClient.post("/insurance/policies", { planId }).then((res) => res.data.policy);
export const cancelInsurancePolicy = (id) =>
  apiClient.patch(`/insurance/policies/${id}/cancel`).then((res) => res.data.policy);

// Restaurants
export const fetchRestaurants = (search) =>
  apiClient
    .get("/restaurants", { params: search ? { search } : {} })
    .then((res) => res.data.restaurants);
export const fetchRestaurant = (slug) =>
  apiClient.get(`/restaurants/${slug}`).then((res) => res.data.restaurant);
export const createRestaurantOrder = (slug, items, note) =>
  apiClient
    .post(`/restaurants/${slug}/orders`, { items, ...(note ? { note } : {}) })
    .then((res) => res.data.order);
export const fetchRestaurantOrders = () =>
  apiClient.get("/restaurants/orders").then((res) => res.data.orders);

// Ride sharing
export const fetchMyRides = () =>
  apiClient.get("/rideshare/rides").then((res) => res.data.rides);
export const createRideRequest = (payload) =>
  apiClient.post("/rideshare/rides", payload).then((res) => res.data.ride);
export const cancelRide = (id) =>
  apiClient.patch(`/rideshare/rides/${id}/cancel`).then((res) => res.data.ride);

// Rider dispatch
export const fetchAvailableRideJobs = () =>
  apiClient.get("/rideshare/jobs/available").then((res) => res.data.rides);
export const fetchMyRideJobs = () =>
  apiClient.get("/rideshare/jobs/mine").then((res) => res.data.rides);
export const acceptRideJob = (id) =>
  apiClient.post(`/rideshare/jobs/${id}/accept`).then((res) => res.data.ride);
export const startRideJob = (id) =>
  apiClient.post(`/rideshare/jobs/${id}/start`).then((res) => res.data.ride);
export const completeRideJob = (id) =>
  apiClient.post(`/rideshare/jobs/${id}/complete`).then((res) => res.data.ride);
