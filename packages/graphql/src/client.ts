import { print } from 'graphql';
import type { TadaDocumentNode } from 'gql.tada';
export class GraphQLRequestError extends Error {
  constructor(
    message: string,
    public response: Response,
  ) {
    super(message);
  }
}
export async function requestGraphQL<Result, Variables>(
  endpoint: string,
  document: TadaDocumentNode<Result, Variables>,
  variables: Variables,
  init?: RequestInit,
) {
  const response = await fetch(endpoint, {
    ...init,
    method: 'POST',
    headers: {
      ...Object.fromEntries(new Headers(init?.headers)),
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query: print(document), variables }),
  });
  const result = (await response.json()) as {
    data?: Result;
    errors?: { message: string }[];
  };
  if (!response.ok || result.errors?.length || !result.data)
    throw new GraphQLRequestError(
      result.errors?.[0]?.message ?? 'The API request failed',
      response,
    );
  return { data: result.data, response };
}
