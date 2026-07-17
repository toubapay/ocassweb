import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Cookies from "js-cookie";
import { fetchMe, requestOtp as requestOtpApi, verifyOtp as verifyOtpApi } from "../api/auth";
import { TOKEN_COOKIE } from "../api/client";
import { setUser, logout as logoutAction } from "../redux/slices/authSlice";

export default function useAuth() {
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    const token = Cookies.get(TOKEN_COOKIE);
    if (token && !user) {
      fetchMe()
        .then((data) => dispatch(setUser(data.user)))
        .catch(() => {
          Cookies.remove(TOKEN_COOKIE);
          dispatch(logoutAction());
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestOtp = useCallback((phone) => requestOtpApi(phone), []);

  const verifyOtp = useCallback(
    async (phone, code, name) => {
      const data = await verifyOtpApi(phone, code, name);
      Cookies.set(TOKEN_COOKIE, data.token, { expires: 7 });
      dispatch(setUser(data.user));
      return data.user;
    },
    [dispatch]
  );

  const logout = useCallback(() => {
    Cookies.remove(TOKEN_COOKIE);
    dispatch(logoutAction());
  }, [dispatch]);

  return { user, isAuthenticated, requestOtp, verifyOtp, logout };
}
