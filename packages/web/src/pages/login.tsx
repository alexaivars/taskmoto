import Router from "next/router";
import { gql } from "@apollo/client";
import { useLoginMutation, useSignupMutation } from "generated/graphql";
import { Button } from "ui/Button";
import { TextInput } from "ui/TextInput";
import { ButtonField } from "ui/ButtonField";
import { FormField } from "ui/FormField";


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

const Login = () => {
  const [login, { data: loginData }] = useLoginMutation();
  const [signup, { data: signupData }] = useSignupMutation();
  const payload = loginData?.login || signupData?.signup;
  if (payload?.__typename === "AuthPayload") {
    Router.push("/");
  }
  return (
    <form
      onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const { password, username, ...entries } = Object.fromEntries(
          new FormData(e.currentTarget)
        ) as { [key: string]: string };
        if (password && username) {
          if ("signup" in entries) {
            signup({ variables: { password, username } });
          }

          if ("login" in entries) {
            login({ variables: { password, username } });
          }
        }
      }}
    >
      <FormField label="Username" id="username">
        <TextInput type="text" name="username" />
      </FormField>
      <FormField label="Password" id="password">
        <TextInput type="password" name="password" />
      </FormField>
      <ButtonField>
        <Button type="submit" name="login" >
          login
        </Button>
        <Button type="submit" name="signup" variant="primary">
          signup
        </Button>
      </ButtonField>
    </form>
  );
};

export default Login;
