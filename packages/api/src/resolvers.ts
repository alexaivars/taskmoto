import * as config from './config';
import { clearAuthCookies, setAuthCookies } from './auth';
import { TimeEntry, Resolvers, ResolverFn, User } from './generated/types';
import createError from 'http-errors';
import { Context } from '.';
import { GraphQLResolveInfo } from 'graphql';

// eslint-disable-next-line
const typeResolver = { __resolveType: (obj: any): any => obj.__typename };

const NOAUTH_RESOLVERS = ['healthCheck', 'login', 'signup'];

const resolvers: Resolvers = {
  Error: typeResolver,
  ReportTimeResult: typeResolver,
  SignupResult: typeResolver,
  LoginResult: typeResolver,
  LogoutResult: typeResolver,
  UserResult: typeResolver,
  Query: {
    healthCheck: () => {
      return 'ok';
    },
    me: async (_root, _args, ctx) => {
      const user: User = await ctx.dataSources.userAPI.getUserById(ctx.userId);
      return user;
    },

    allTimeEntries: async (_root, _args, ctx) => {
      let entries: TimeEntry[] = [];
      let logEntries: TimeEntry[] = [];
      let cursor = '0';

      do {
        [cursor, entries] = await ctx.dataSources.reportAPI.getEntries(
          cursor,
          10
        );
        logEntries = logEntries.concat(entries);
      } while (cursor !== '0');

      return {
        __typename: 'TimeEntriesConnection',
        cursor,
        hasMore: cursor !== '0',
        logEntries,
      };
    },
  },

  Mutation: {
    deleteTime: async (_root, args, ctx) => {
      const { id } = args;
      const { dataSources } = ctx;
      try {
        const entry = await dataSources.reportAPI.getEntryById(id);
        return entry;
      } catch (err) {
        return {
          __typename: 'DeleteTimeError',
          message: (err as Error).message,
        };
      }
    },
    reportTime: async (_root, args, ctx) => {
      const { minutes, name } = args;
      const { dataSources } = ctx;
      try {
        const entry = await dataSources.reportAPI.createLog(
          minutes,
          name || ''
        );
        return entry;
      } catch (err) {
        return {
          __typename: 'ReportTimeError',
          message: (err as Error).message,
        };
      }
    },

    signup: async (_root, args, ctx) => {
      const { username, password } = args;
      const { dataSources, res } = ctx;
      try {
        const iat = await dataSources.userAPI.getTimestamp();
        const user = await dataSources.userAPI.createUser(username, password);
        const refreshToken = await dataSources.userAPI.createRefreshToken(
          user.id,
          iat
        );
        const accessToken = await dataSources.userAPI.createAccessToken(
          user.id,
          config.jwtAccessTokenSecret,
          iat
        );
        setAuthCookies(res, {
          refreshToken,
          accessToken,
        });
        return {
          __typename: 'AuthPayload',
          user,
        };
      } catch (err) {
        return {
          __typename: 'SignupError',
          message: (err as Error).message,
        };
      }
    },

    login: async (_root, args, ctx) => {
      const { username, password } = args;
      const { dataSources, res } = ctx;
      try {
        const user = await dataSources.userAPI.authenticateUser(
          username,
          password
        );
        const iat = await dataSources.userAPI.getTimestamp();
        const refreshToken = await dataSources.userAPI.createRefreshToken(
          user.id,
          iat
        );
        const accessToken = await dataSources.userAPI.createAccessToken(
          user.id,
          config.jwtAccessTokenSecret,
          iat
        );
        setAuthCookies(res, {
          refreshToken,
          accessToken,
        });

        return {
          __typename: 'AuthPayload',
          user,
        };
      } catch (err) {
        return {
          __typename: 'LoginError',
          message: (err as Error).message,
        };
      }
    },

    logout: async (_root, _args, ctx) => {
      try {
        const { dataSources, res, userId, tokenId } = ctx;
        clearAuthCookies(res);
        const ok = Boolean(
          await dataSources.userAPI.removeRefreshToken(userId, tokenId)
        );
        return { __typename: 'LogoutPayload', ok };
      } catch (err) {
        return {
          __typename: 'LogoutError',
          message: (err as Error).message,
        };
      }
    },
  },
};

const AuthResolver =
  (resolver: ResolverFn<unknown, unknown, Context, unknown>) =>
  async (
    root: unknown,
    args: unknown,
    ctx: Context,
    info: GraphQLResolveInfo
  ) => {
    try {
      if (!ctx.userId) {
        throw new createError.Unauthorized();
      }
      return resolver(root, args, ctx, info);
    } catch (err) {
      return {
        __typename: 'AuthError',
        message: (err as Error).message,
      };
    }
  };

resolvers.Query = Object.entries(
  resolvers.Query as {
    [key: string]: ResolverFn<unknown, unknown, Context, unknown>;
  }
).reduce(
  (acc, [key, value]) =>
    Object.assign(acc, {
      [key]: NOAUTH_RESOLVERS.includes(key) ? value : AuthResolver(value),
    }),
  {}
);

resolvers.Mutation = Object.entries(
  resolvers.Mutation as {
    [key: string]: ResolverFn<unknown, unknown, Context, unknown>;
  }
).reduce(
  (acc, [key, value]) =>
    Object.assign(acc, {
      [key]: NOAUTH_RESOLVERS.includes(key) ? value : AuthResolver(value),
    }),
  {}
);

export default resolvers;
