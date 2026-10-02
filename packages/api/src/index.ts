import Redis from 'ioredis';
import ReportAPI from './datasources/ReportAPI';
import UserAPI from './datasources/UserAPI';
import express, { Response } from 'express';
import cors from 'cors';
import https from 'https';
import resolvers from './resolvers';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { createAuthMiddleware } from './authMiddleware';
import { join } from 'path';
import { readFileSync } from 'fs';
import * as config from './config';

export interface IDataSources {
  reportAPI: ReportAPI;
  userAPI: UserAPI;
  res?: Response;
}

export type Context = {
  dataSources: IDataSources;
  res: Response;
  userId: string;
  tokenId: string;
};

const redis = new Redis();

const credentials = { key: config.sslPrivateKey, cert: config.sslCertificate };

(async function startApolloServer() {
  const server = new ApolloServer<Context>({
    typeDefs: readFileSync(join(__dirname, './schema.graphql'), 'utf8'),
    resolvers,
    plugins: [
      ApolloServerPluginLandingPageLocalDefault({
        embed: true,
        includeCookies: true,
      }),
    ],
    // mocks: {
    //   Time: () => new Date(0).getTime(),
    //   DateTime: () => new Date(0).toISOString(),
    //   Email: () => "mock@domain.test",
    //   Query: () => ({
    //     name: () => casual.name,
    //   }),
    // },
  });

  const app = express();

  app.use(
    createAuthMiddleware(
      new UserAPI({ store: redis }),
      config.jwtAccessTokenSecret,
      config.jwtAccessTokenPublic,
    ),
  );

  await server.start();

  app.use(
    '/graphql',
    cors({
      origin: (origin, callback) => callback(null, origin ?? true),
      credentials: true,
    }),
    express.json(),
    expressMiddleware(server, {
      context: async ({ res }) => ({
        dataSources: {
          reportAPI: new ReportAPI({ store: redis, userId: res.locals.userId }),
          userAPI: new UserAPI({ store: redis }),
        },
        res,
        userId: res.locals.userId,
        tokenId: res.locals.tokenId,
      }),
    }),
  );

  const httpsServer = https.createServer(credentials, app);

  httpsServer.listen(8443, () => {
    console.log(`Server ready at https://localhost:${8443}/graphql`);
  });
})();
