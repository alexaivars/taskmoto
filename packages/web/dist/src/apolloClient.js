'use strict';
var __assign =
  (this && this.__assign) ||
  function () {
    __assign =
      Object.assign ||
      function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
    return __assign.apply(this, arguments);
  };
Object.defineProperty(exports, '__esModule', { value: true });
var client_1 = require('@apollo/client');
var apolloClient;
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
var endpoint =
  typeof window === 'undefined' ? 'https://localhost:3000/graphql' : '/graphql';
function createApolloClient(initialState, ctx) {
  // The `ctx` (NextPageContext) will only be present on the server.
  // use it to extract auth headers (ctx.req) or similar.
  var enchancedFetch = function (url, init) {
    return fetch(
      url,
      __assign(__assign({}, init), {
        headers: __assign(__assign({}, init.headers), {
          Cookie: ctx.req.headers.cookie,
        }),
      })
    ).then(function (response) {
      return response;
    });
  };
  return new client_1.ApolloClient({
    ssrMode: Boolean(ctx),
    link: new client_1.HttpLink({
      uri: endpoint,
      credentials: 'same-origin',
      fetch: ctx ? enchancedFetch : fetch,
      fetchOptions:
        // @ts-ignore
        typeof https !== 'undefined'
          ? // @ts-ignore
            { agent: new https.Agent({ rejectUnauthorized: false }) }
          : undefined,
    }),
    cache: new client_1.InMemoryCache().restore(initialState),
  });
}
exports.default = createApolloClient;
