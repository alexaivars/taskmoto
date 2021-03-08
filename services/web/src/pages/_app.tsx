import { ApolloProvider } from "@apollo/client";
import { AppProps /*, AppContext */ } from "next/app";
import "../styles/globals.css";
import createApolloClient from "../apolloClient";

function MyApp({ Component, pageProps }: AppProps) {
  const apolloClient = createApolloClient(pageProps.initialApolloState);
  return (
    <ApolloProvider client={apolloClient}>
      <Component {...pageProps} />
    </ApolloProvider>
  );
}

export default MyApp;
