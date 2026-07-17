import * as React from "react";
import Head from "next/head";
import { CacheProvider } from "@emotion/react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Provider as ReduxProvider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { QueryClient, QueryClientProvider } from "react-query";
import { Toaster } from "react-hot-toast";

import theme from "../src/theme";
import createEmotionCache from "../src/theme/createEmotionCache";
import { store, persistor } from "../src/redux/store";
import AppLayout from "../src/components/layout/AppLayout";

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
          <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
              <CssBaseline />
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
