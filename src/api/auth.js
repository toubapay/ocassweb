import apiClient from "./client";

export const requestOtp = (phone) =>
  apiClient.post("/auth/otp/request", { phone }).then((res) => res.data);

export const verifyOtp = (phone, code, name) =>
  apiClient.post("/auth/otp/verify", { phone, code, name }).then((res) => res.data);

export const fetchMe = () => apiClient.get("/auth/me").then((res) => res.data);

export const updateRole = (role) =>
  apiClient.patch("/auth/role", { role }).then((res) => res.data.user);
