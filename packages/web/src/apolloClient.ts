import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  NormalizedCacheObject,
} from '@apollo/client';
import { GetServerSidePropsContext } from 'next';

const endpoint =
  typeof window === 'undefined' ? 'https://localhost:3000/graphql' : '/graphql';

export default function createApolloClient(
  initialState: NormalizedCacheObject,
  ctx?: GetServerSidePropsContext
): ApolloClient<NormalizedCacheObject> {
  // The `ctx` (NextPageContext) will only be present on the server.
  // use it to extract auth headers (ctx.req) or similar.
  const enchancedFetch = (input: RequestInfo, init: RequestInit | undefined) =>
    fetch(input, {
      ...init,
      headers: {
        ...init?.headers,
        Cookie: ctx?.req.headers.cookie,
      } as HeadersInit,
    }).then((response) => response);

  return new ApolloClient({
    ssrMode: Boolean(ctx),
    link: new HttpLink({
      uri: endpoint, // Server URL (must be absolute)
      credentials: 'same-origin', // Additional fetch() options like `credentials` or `headers`
      fetch: ctx ? enchancedFetch : fetch,
      // fetchOptions:
      //   typeof https !== 'undefined'
      //     ? { agent: new https.Agent({ rejectUnauthorized: false }) }
      //     : undefined,
    }),
    cache: new InMemoryCache().restore(initialState),
  });
}
