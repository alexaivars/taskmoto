import Router from 'next/router';
import { gql } from '@apollo/client';
import { useLoginMutation, useSignupMutation } from 'generated/graphql';
import { Form, Button, TextInput, ButtonField, FormField } from 'ui';
import Layout from 'components/Layout';
import { ReactNode, SyntheticEvent, useCallback } from 'react';

gql`
  mutation login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      ... on AuthPayload {
        user {
          id
          username
        }
      }
      ... on Error {
        message
      }
    }
  }
`;

gql`
  mutation signup($username: String!, $password: String!) {
    signup(username: $username, password: $password) {
      ... on AuthPayload {
        user {
          id
          username
        }
      }
      ... on Error {
        message
      }
    }
  }
`;

const Login = (): ReactNode => {
  const [login, { data: loginData }] = useLoginMutation();
  const [signup, { data: signupData }] = useSignupMutation();
  const payload = loginData?.login || signupData?.signup;
  const errorMessage =
    payload && payload?.__typename === 'AuthPayload'
      ? undefined
      : payload?.message;

  if (payload?.__typename === 'AuthPayload') {
    Router.push('/');
  }

  const handleSubmit = useCallback(
    (e: SyntheticEvent<HTMLButtonElement | HTMLFormElement>) => {
      e.preventDefault();
      const form: HTMLFormElement = e.currentTarget.form
        ? e.currentTarget.form
        : e.currentTarget;

      const entries: { [key: string]: FormDataEntryValue } = Object.fromEntries(
        new FormData(form)
      );

      if (entries.password && entries.username) {
        const variables = {
          password: entries.password.toString(),
          username: entries.username.toString(),
        };
        e.currentTarget.name === 'signup'
          ? signup({ variables })
          : login({ variables });
      }
    },
    [login, signup]
  );

  return (
    <Layout>
      <Form onSubmit={handleSubmit}>
        {errorMessage && <p>{errorMessage}</p>}
        <FormField label="Username" id="username">
          <TextInput type="text" name="username" />
        </FormField>
        <FormField label="Password" id="password">
          <TextInput type="password" name="password" />
        </FormField>
        <ButtonField>
          <Button type="submit" name="login" onClick={handleSubmit}>
            login
          </Button>
          <Button
            type="submit"
            name="signup"
            variant="primary"
            onClick={handleSubmit}
          >
            signup
          </Button>
        </ButtonField>
      </Form>
    </Layout>
  );
};

export default Login;
