import { ApolloProvider } from "@apollo/client";
import { AppProps /*, AppContext */ } from "next/app";
import "../styles/globals.css";
import createApolloClient from "../apolloClient";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "ui/theme";
import GlobalStyle from "ui/GlobalStyle";

function MyApp({ Component, pageProps }: AppProps) {
  const apolloClient = createApolloClient(pageProps.initialApolloState);
  return (
    <ThemeProvider theme={lightTheme}>
      <GlobalStyle/>
      <ApolloProvider client={apolloClient}>
        <Component {...pageProps} />
      </ApolloProvider>
    </ThemeProvider>
  );
}

export default MyApp;
