import { ApolloProvider } from "@apollo/client";
import { AppProps /*, AppContext */ } from "next/app";
import createApolloClient from "../apolloClient";
import { ThemeProvider } from "styled-components";
import { theme } from "@taskmoto/ui";
import { GlobalStyle } from "@taskmoto/ui";

function MyApp({ Component, pageProps }: AppProps) {
  const apolloClient = createApolloClient(pageProps.initialApolloState);
  return (
    <ThemeProvider theme={theme.lightTheme}>
      <GlobalStyle />
      <ApolloProvider client={apolloClient}>
        <Component {...pageProps} />
      </ApolloProvider>
    </ThemeProvider>
  );
}

export default MyApp;
