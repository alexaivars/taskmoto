import { requestGraphQL, GraphQLRequestError } from '@taskmoto/graphql/client';
import type { TadaDocumentNode } from 'gql.tada';
export const apiUrl =
  process.env.API_URL ??
  process.env.API_HOST ??
  `${process.env.SSL_PRIVATE_KEY || process.env.SSL_PRIVATE_KEY_FILE ? 'https' : 'http'}://localhost:8443/graphql`;
// Request-local cookie jar propagates refresh rotation between sequential API calls and back to the browser.
export function apiClient(request: Request, outgoing: Headers) {
  const cookies = new Map(
    (request.headers.get('cookie') ?? '')
      .split(';')
      .filter(Boolean)
      .map((pair) => {
        const offset = pair.indexOf('=');
        return [pair.slice(0, offset).trim(), pair.slice(offset + 1)] as const;
      }),
  );
  function receiveCookies(response: Response) {
    for (const cookie of response.headers.getSetCookie()) {
      outgoing.append('set-cookie', cookie);
      const pair = cookie.split(';')[0];
      const offset = pair.indexOf('=');
      cookies.set(pair.slice(0, offset), pair.slice(offset + 1));
    }
  }
  return async function query<Result, Variables>(
    document: TadaDocumentNode<Result, Variables>,
    variables: Variables,
  ) {
    const headers = new Headers({
      cookie: Array.from(cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join('; '),
    });
    const origin = request.headers.get('origin');
    if (origin) headers.set('origin', origin);
    const authorization = request.headers.get('authorization');
    if (authorization) headers.set('authorization', authorization);
    try {
      const result = await requestGraphQL(apiUrl, document, variables, {
        headers,
      });
      receiveCookies(result.response);
      return result.data;
    } catch (error) {
      if (error instanceof GraphQLRequestError) receiveCookies(error.response);
      throw error;
    }
  };
}
