import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import type { NormalizedCacheObject } from '@apollo/client';
import { GetServerSidePropsContext } from 'next';

const endpoint =
  typeof window === 'undefined' ? 'https://localhost:3000/graphql' : '/graphql';

export default function createApolloClient(
  initialState: NormalizedCacheObject,
  ctx?: GetServerSidePropsContext,
): ApolloClient {
  // The `ctx` (NextPageContext) will only be present on the server.
  // use it to extract auth headers (ctx.req) or similar.
  const enhancedFetch: typeof fetch = (input, init) => {
    const headers = new Headers(init?.headers);
    const cookie = ctx?.req.headers.cookie;
    if (cookie) headers.set('Cookie', cookie);
    return fetch(input, { ...init, headers });
  };

  return new ApolloClient({
    ssrMode: Boolean(ctx),
    link: new HttpLink({
      uri: endpoint, // Server URL (must be absolute)
      credentials: 'same-origin', // Additional fetch() options like `credentials` or `headers`
      fetch: ctx ? enhancedFetch : fetch,
      // fetchOptions:
      //   typeof https !== 'undefined'
      //     ? { agent: new https.Agent({ rejectUnauthorized: false }) }
      //     : undefined,
    }),
    cache: new InMemoryCache().restore(initialState),
  });
}
