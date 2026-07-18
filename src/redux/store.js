import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import authReducer from "./slices/authSlice";
import layoutReducer from "./slices/layoutSlice";
import i18nReducer from "./slices/i18nSlice";

const rootReducer = combineReducers({
  auth: authReducer,
  layout: layoutReducer,
  i18n: i18nReducer,
});

const persistConfig = {
  key: "ocass-root",
  storage,
  whitelist: ["auth", "layout", "i18n"],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE", "persist/REGISTER"],
      },
    }),
});

export const persistor = persistStore(store);
