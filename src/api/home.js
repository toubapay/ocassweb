import apiClient from "./client";

// Resolves to null when the admin has turned the banner off (see
// AdminHomeBannerTab.js) - not gated behind any module, always reachable.
export const fetchHomeBanner = () =>
  apiClient.get("/home/banner").then((res) => res.data.banner);
