import Redis from "ioredis";
import ReportAPI from "./datasources/ReportAPI";
import UserAPI from "./datasources/UserAPI";
import express, { Response } from "express";
import https from "https";
import resolvers from "./resolvers";
import { ApolloServer } from "apollo-server-express";
import { DataSources } from "apollo-server-core/dist/graphqlOptions";
import { createAuthMiddleware } from "./authMiddleware";
import { join } from "path";
import { readFileSync } from "fs";
import * as config from './config';
interface IDataSources {
  reportAPI: ReportAPI;
  userAPI: UserAPI;
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

  const server = new ApolloServer({
    typeDefs: readFileSync(join(__dirname, "./schema.graphql"), "utf8"),
    resolvers,
    dataSources: (): DataSources<IDataSources> => ({
      reportAPI: new ReportAPI({ store: redis }),
      userAPI: new UserAPI({ store: redis }),
    }),
    context: async ({ res }) => ({
      res,
      userId: res.locals.userId,
      tokenId: res.locals.tokenId,
    }),
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
      config.jwtAccessTokenPublic
    )
  );
  server.applyMiddleware({ app });

  https.createServer(credentials, app);

  var httpsServer = https.createServer(credentials, app);

  httpsServer.listen(8443, () => {
    console.log(
      `🚀 Server ready at https://localhost:${8443}${server.graphqlPath}`
    );
  });
})();
