import * as React from "react";
import Head from "next/head";
import { CacheProvider } from "@emotion/react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import GlobalStyles from "@mui/material/GlobalStyles";
import { Provider as ReduxProvider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { QueryClient, QueryClientProvider } from "react-query";
import { Toaster } from "react-hot-toast";

import theme from "../src/theme";
import createEmotionCache from "../src/theme/createEmotionCache";
import { store, persistor } from "../src/redux/store";
import AppLayout from "../src/components/layout/AppLayout";
import "../src/i18n";
import I18nSync from "../src/i18n/I18nSync";

const clientSideEmotionCache = createEmotionCache();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function App(props) {
  const { Component, emotionCache = clientSideEmotionCache, pageProps } = props;

  return (
    <CacheProvider value={emotionCache}>
      <Head>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
        <title>Ocass</title>
      </Head>
      <ReduxProvider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <I18nSync />
          <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              {/* Google Places Autocomplete (AddressAutocompleteField.js) appends its
                  suggestions dropdown directly to document.body with its own default
                  z-index, which sits below MUI's Dialog (zIndex.modal, 1300) - inside
                  any dialog (e.g. Anando's "Publier un trajet") the dropdown rendered
                  but was hidden behind the dialog itself. Global CSS is required since
                  the dropdown lives outside the app's React tree. */}
              <GlobalStyles
                styles={(t) => ({
                  ".pac-container": { zIndex: `${t.zIndex.tooltip} !important` },
                })}
              />
              <AppLayout>
                <Component {...pageProps} />
              </AppLayout>
              <Toaster position="top-center" toastOptions={{ duration: 2200 }} />
            </ThemeProvider>
          </QueryClientProvider>
        </PersistGate>
      </ReduxProvider>
    </CacheProvider>
  );
}
