import { useMemo } from "react";
import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  NormalizedCacheObject,
} from "@apollo/client";
import { GetServerSidePropsContext, NextPageContext } from "next";

let apolloClient: ApolloClient<NormalizedCacheObject>;

// function createApolloClient() {
//  return new ApolloClient({
//     ssrMode: typeof window === "undefined", // set to true for SSR
//     link: new HttpLink({
//       uri: typeof window === "undefined" ? "https://localhost:3000/graphql" : "/graphql",
//     }),
//     cache: new InMemoryCache(),
//   });
// }

// export function initializeApollo(initialState = null) {
//   const _apolloClient = apolloClient ?? createApolloClient();

//   // If your page has Next.js data fetching methods that use Apollo Client,
//   // the initial state gets hydrated here
//   if (initialState) {
//     // Get existing cache, loaded during client side data fetching
//     const existingCache = _apolloClient.extract();

//     // Restore the cache using the data passed from
//     // getStaticProps/getServerSideProps combined with the existing cached data
//     console.log( existingCache, initialState);
//     _apolloClient.cache.restore({ ...existingCache, ...initialState });
//   }

//   // For SSG and SSR always create a new Apollo Client
//   if (typeof window === "undefined") return _apolloClient;

//   // Create the Apollo Client once in the client
//   if (!apolloClient) apolloClient = _apolloClient;
//   return _apolloClient;
// }

// export function useApollo(initialState: NormalizedCacheObject) {
//   const store = useMemo(() => initializeApollo(initialState), [initialState]);
//   return store;
// }

const endpoint =
  typeof window === "undefined" ? "https://localhost:3000/graphql" : "/graphql";

export default function createApolloClient(
  initialState: NormalizedCacheObject,
  ctx?: GetServerSidePropsContext
) {
  // The `ctx` (NextPageContext) will only be present on the server.
  // use it to extract auth headers (ctx.req) or similar.

  const enchancedFetch = (url: string, init: any) =>
    fetch(url, {
      ...init,
      headers: {
        ...init.headers,
        Cookie: ctx.req.headers.cookie,
      },
    }).then((response) => response);

  return new ApolloClient({
    ssrMode: Boolean(ctx),
    link: new HttpLink({
      uri: endpoint, // Server URL (must be absolute)
      credentials: "same-origin", // Additional fetch() options like `credentials` or `headers`
      fetch: ctx ? enchancedFetch : fetch,
      fetchOptions:
        // @ts-ignore
        typeof https !== "undefined"
          ? // @ts-ignore
            { agent: new https.Agent({ rejectUnauthorized: false }) }
          : undefined,
    }),
    cache: new InMemoryCache().restore(initialState),
  });
}
