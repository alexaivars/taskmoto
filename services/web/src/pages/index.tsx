import jwt from "jsonwebtoken";
import getConfig from "next/config";
import styled from "styled-components";
import { gql, useQuery } from "@apollo/client";
import createApolloClient from "../apolloClient";
import { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
const { serverRuntimeConfig: config } = getConfig();
import { MeDocument } from "../generated/graphql";

const Title = styled.h1`
  font-size: 50px;
`;

const ME_QUERY = gql`
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

type Props = {
  id: string | null;
  username: string | null;
};

export async function getServerSideProps(
  ctx: GetServerSidePropsContext
): Promise<GetServerSidePropsResult<Props>> {
  const client = createApolloClient({}, ctx);
  const accessToken = ctx.req.cookies["access-token"];
  try {
    console.log(">", jwt.verify(accessToken, config.jwtAccessTokenPublic));
  } catch {}

  const { data } = await client.query({
    query: MeDocument,
  })
  
  if (data.me.__typename !== "User") {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  return {
    props: { username: data?.me?.username || null, id: data?.me?.id || null }, // will be passed to the page component as props
  };
}
export default function Home({ username }: Props) {
  const { data } = useQuery(ME_QUERY);
  return <Title>{data?.me?.username || username} page</Title>;
}
