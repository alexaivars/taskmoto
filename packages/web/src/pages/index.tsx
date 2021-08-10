import jwt from 'jsonwebtoken';
import getConfig from 'next/config';
import { gql } from '@apollo/client';
import createApolloClient from '../apolloClient';
import { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import {
  MeDocument,
  useMeQuery,
  useAllTimeEntriesQuery,
  useSaveTimeEntryMutation,
  useDeleteTimeEntryMutation,
  User,
} from 'generated/graphql';
import Layout from 'components/Layout';
import { List, Form, FormField, Button, ButtonField, TextInput } from 'ui';
import { ReactNode, SyntheticEvent } from 'react';

const { serverRuntimeConfig: config } = getConfig();

gql`
  query me {
    me {
      ... on User {
        id
        username
      }
      ... on Error {
        message
      }
    }
  }
`;

gql`
  query allTimeEntries {
    allTimeEntries {
      hasMore
      logEntries {
        id
        minutes
        name
      }
    }
  }
`;

gql`
  mutation saveTimeEntry($minutes: Minutes!, $name: String) {
    reportTime(minutes: $minutes, name: $name) {
      ... on Error {
        message
      }

      ... on TimeEntry {
        id
      }
    }
  }
`;

gql`
  mutation deleteTimeEntry($id: ID!) {
    deleteTime(id: $id) {
      ... on Error {
        message
      }

      ... on TimeEntry {
        id
      }
    }
  }
`;

type Props = {
  id: string | null;
  username: string | null;
};

export async function getServerSideProps(
  ctx: GetServerSidePropsContext
): Promise<GetServerSidePropsResult<Props>> {
  const client = createApolloClient({}, ctx);
  const accessToken = ctx.req.cookies['access-token'];
  try {
    console.log('>', jwt.verify(accessToken, config.jwtAccessTokenPublic));
  } catch {}
  console.log('=>>');
  const { data } = await client.query({
    query: MeDocument,
  });

  if (data.me.__typename !== 'User') {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  return {
    props: { username: data?.me?.username || null, id: data?.me?.id || null }, // will be passed to the page component as props
  };
}

export default function Home(): ReactNode {
  const { data } = useMeQuery();
  const [save] = useSaveTimeEntryMutation();
  const [remove] = useDeleteTimeEntryMutation();
  const errorMessage = '';
  const { data: allTimeEntriesData, refetch } = useAllTimeEntriesQuery();

  const entries = allTimeEntriesData?.allTimeEntries?.logEntries || [];

  const user: User | undefined =
    data?.me?.__typename === 'User' ? data.me : undefined;

  const handleSubmit = (
    e: SyntheticEvent<HTMLButtonElement | HTMLFormElement>
  ) => {
    e.preventDefault();
    const form: HTMLFormElement = e.currentTarget.form
      ? e.currentTarget.form
      : e.currentTarget;

    const entries: { [key: string]: FormDataEntryValue } = Object.fromEntries(
      new FormData(form)
    );

    if (entries.minutes && entries.name) {
      const variables = {
        minutes: parseInt(entries.minutes.toString(), 10),
        name: entries.name.toString(),
      };
      save({ variables }).then(() => refetch());
    }
  };

  if (!user) {
    return null;
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${now
    .getMonth()
    .toString()
    .padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

  return (
    <Layout user={user} title={`Wellcome ${user.username}`}>
      <Form onSubmit={handleSubmit}>
        {errorMessage && <p>{errorMessage}</p>}
        <FormField label="Date" id="date">
          <TextInput type="date" name="date" defaultValue={today} />
        </FormField>
        <FormField label="Minutes" id="minutes">
          <TextInput type="number" name="minutes" />
        </FormField>
        <FormField label="Description" id="name">
          <TextInput type="text" name="name" />
        </FormField>
        <ButtonField>
          <Button type="submit" name="add" onClick={handleSubmit}>
            Add
          </Button>
        </ButtonField>
      </Form>
      <List items={entries}>
        {{
          render: ({ index }) => {
            const entry = entries[index];
            return (
              <div key={entry.id}>
                <div>
                  <b>{entry.minutes}</b>
                </div>
                <p>{entry.name}</p>
              </div>
            );
          },
          remove: ({ index }) => {
            const entry = entries[index];
            remove({ variables: { id: entry.id } }).then(() => refetch());
          },
        }}
      </List>
    </Layout>
  );
}
