import { initGraphQLTada, type ResultOf } from 'gql.tada';
import type { introspection } from './generated/introspection.ts';
export const graphql = initGraphQLTada<{
  introspection: typeof introspection;
  scalars: { Minutes: number };
}>();
export const Me = graphql(`
  query Me {
    me {
      __typename
      ... on User {
        id
        username
      }
      ... on AuthError {
        message
      }
    }
  }
`);
export const Entries = graphql(`
  query Entries {
    allTimeEntries {
      logEntries {
        id
        name
        minutes
      }
    }
  }
`);
export const Signup = graphql(`
  mutation Signup($username: String!, $password: String!) {
    signup(username: $username, password: $password) {
      __typename
      ... on AuthPayload {
        user {
          id
          username
        }
      }
      ... on SignupError {
        message
      }
    }
  }
`);
export const Login = graphql(`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      __typename
      ... on AuthPayload {
        user {
          id
          username
        }
      }
      ... on LoginError {
        message
      }
      ... on AuthError {
        message
      }
    }
  }
`);
export const Logout = graphql(`
  mutation Logout {
    logout {
      __typename
      ... on LogoutPayload {
        ok
      }
      ... on LogoutError {
        message
      }
      ... on AuthError {
        message
      }
    }
  }
`);
export const ReportTime = graphql(`
  mutation ReportTime($minutes: Minutes!, $name: String) {
    reportTime(minutes: $minutes, name: $name) {
      __typename
      ... on TimeEntry {
        id
        name
        minutes
      }
      ... on ReportTimeError {
        message
      }
      ... on AuthError {
        message
      }
    }
  }
`);
export const DeleteTime = graphql(`
  mutation DeleteTime($id: ID!) {
    deleteTime(id: $id) {
      __typename
      ... on TimeEntry {
        id
      }
      ... on DeleteTimeError {
        message
      }
      ... on AuthError {
        message
      }
    }
  }
`);
export type CurrentUser = Extract<
  ResultOf<typeof Me>['me'],
  { __typename: 'User' }
>;
export type LogEntry = NonNullable<
  ResultOf<typeof Entries>['allTimeEntries']
>['logEntries'][number];
