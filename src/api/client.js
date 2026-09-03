import axios from "axios";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { store } from "../redux/store";
import { logout } from "../redux/slices/authSlice";
import i18n from "../i18n";

export const TOKEN_COOKIE = "ocass-token";

// Same-origin by default - next.config.js rewrites /api/* to the backend
// server-side, so the browser never needs the backend's real URL.
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || "/api",
});

apiClient.interceptors.request.use((config) => {
  const token = Cookies.get(TOKEN_COOKIE);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 401 with no token attached just means an anonymous request hit a
    // protected endpoint on purpose (e.g. a logged-out visitor's cart
    // poll) - nothing to clear. A 401 WITH a token means the token itself
    // was rejected (expired/invalid). Removing the cookie alone used to
    // leave `auth.user`/`isAuthenticated` untouched in the redux-persist-
    // backed store, so the UI kept rendering as logged-in - every
    // subsequent write (add to cart, wishlist, ...) would silently 401
    // again and surface only that call's generic "could not do X" toast,
    // with no indication the user needed to log back in.
    if (error.response?.status === 401 && Cookies.get(TOKEN_COOKIE)) {
      Cookies.remove(TOKEN_COOKIE);
      store.dispatch(logout());
      toast.error(i18n.t("common.sessionExpired"));
    }
    return Promise.reject(error);
  }
);

export default apiClient;
