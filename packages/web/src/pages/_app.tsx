import { ApolloProvider } from '@apollo/client';
import { AppProps /*, AppContext */ } from 'next/app';
import createApolloClient from '../apolloClient';
import { ThemeProvider } from 'styled-components';
import { GlobalStyle, theme } from 'ui';
import { ReactNode } from 'react';

function MyApp({ Component, pageProps }: AppProps): ReactNode {
  const apolloClient = createApolloClient(pageProps.initialApolloState);
  return (
    <ThemeProvider theme={theme.light}>
      <GlobalStyle />
      <ApolloProvider client={apolloClient}>
        <Component {...pageProps} />
      </ApolloProvider>
    </ThemeProvider>
  );
}

export default MyApp;
