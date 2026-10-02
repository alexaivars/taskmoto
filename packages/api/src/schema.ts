import SchemaBuilder from '@pothos/core';
import { GraphQLError, GraphQLScalarType, Kind } from 'graphql';
import type { FastifyReply } from 'fastify';
import type { Config } from './config.ts';
import type { User, TimeEntry } from './models.ts';
import UserAPI from './datasources/UserAPI.ts';
import ReportAPI from './datasources/ReportAPI.ts';
import { setSession, clearSession, type Identity } from './session.ts';

export interface Context {
  users: UserAPI;
  reports?: ReportAPI;
  identity?: Identity;
  reply: FastifyReply;
  config: Config;
}
const builder = new SchemaBuilder<{
  Context: Context;
  DefaultFieldNullability: false;
  Scalars: { Minutes: { Input: number; Output: number } };
}>({ defaultFieldNullability: false });
function minutes(value: unknown) {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    value > 2147483647
  )
    throw new GraphQLError('Minutes must be a positive integer');
  return value;
}
builder.addScalarType(
  'Minutes',
  new GraphQLScalarType({
    name: 'Minutes',
    serialize: minutes,
    parseValue: minutes,
    parseLiteral: (node) =>
      minutes(node.kind === Kind.INT ? Number(node.value) : undefined),
  }),
  {},
);
const UserType = builder.objectRef<User>('User').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    username: t.exposeString('username'),
  }),
});
const EntryType = builder.objectRef<TimeEntry>('TimeEntry').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    minutes: t.field({ type: 'Minutes', resolve: (entry) => entry.minutes }),
  }),
});
const AuthPayload = builder
  .objectRef<{ __typename: 'AuthPayload'; user: User }>('AuthPayload')
  .implement({
    fields: (t) => ({
      user: t.field({ type: UserType, resolve: (payload) => payload.user }),
    }),
  });
const LogoutPayload = builder
  .objectRef<{ __typename: 'LogoutPayload'; ok: boolean }>('LogoutPayload')
  .implement({ fields: (t) => ({ ok: t.exposeBoolean('ok') }) });
const Connection = builder
  .objectRef<{ cursor: string; hasMore: boolean; logEntries: TimeEntry[] }>(
    'TimeEntriesConnection',
  )
  .implement({
    fields: (t) => ({
      cursor: t.exposeString('cursor'),
      hasMore: t.exposeBoolean('hasMore'),
      logEntries: t.field({
        type: [EntryType],
        resolve: (connection) => connection.logEntries,
      }),
    }),
  });
const ErrorInterface = builder
  .interfaceRef<{ message: string }>('Error')
  .implement({ fields: (t) => ({ message: t.exposeString('message') }) });
type Failure<Name extends string = string> = {
  __typename: Name;
  message: string;
};
function errorType<Name extends string>(name: Name) {
  return builder.objectRef<Failure<Name>>(name).implement({
    interfaces: [ErrorInterface],
    fields: (t) => ({ message: t.exposeString('message') }),
    isTypeOf: (value) =>
      typeof value === 'object' &&
      value !== null &&
      '__typename' in value &&
      value.__typename === name,
  });
}
const AuthError = errorType('AuthError');
const SignupError = errorType('SignupError');
const LoginError = errorType('LoginError');
const LogoutError = errorType('LogoutError');
const ReportTimeError = errorType('ReportTimeError');
const DeleteTimeError = errorType('DeleteTimeError');
const UserResult = builder.unionType('UserResult', {
  types: [UserType, AuthError],
  resolveType: (value) => value.__typename,
});
const SignupResult = builder.unionType('SignupResult', {
  types: [AuthPayload, SignupError],
  resolveType: (value) => value.__typename,
});
const LoginResult = builder.unionType('LoginResult', {
  types: [AuthPayload, LoginError, AuthError],
  resolveType: (value) => value.__typename,
});
const LogoutResult = builder.unionType('LogoutResult', {
  types: [LogoutPayload, LogoutError, AuthError],
  resolveType: (value) => value.__typename,
});
const ReportResult = builder.unionType('ReportTimeResult', {
  types: [EntryType, ReportTimeError, AuthError],
  resolveType: (value) => value.__typename,
});
const DeleteResult = builder.unionType('DeleteTimeResult', {
  types: [EntryType, DeleteTimeError, AuthError],
  resolveType: (value) => value.__typename,
});
const unauthorized = (): Failure<'AuthError'> => ({
  __typename: 'AuthError',
  message: 'Login required',
});
// Only expected input errors reach clients; infrastructure details stay in server logs.
const publicErrors = [
  'Username is already taken',
  'Invalid credentials',
  'Entry not found',
  'Minutes must be a positive integer',
  'Keep the description within 500 characters',
];
function failure<Name extends string>(
  name: Name,
  error: unknown,
  fallback: string,
  context: Context,
): Failure<Name> {
  const message = error instanceof Error ? error.message : '';
  const expected =
    publicErrors.includes(message) ||
    message.startsWith('Use 3–64 ') ||
    message.startsWith('Use a password ');
  if (!expected) context.reply.log.error({ err: error }, fallback);
  return { __typename: name, message: expected ? message : fallback };
}
async function login(context: Context, user: User) {
  if (context.identity)
    await context.users.removeRefreshToken(
      context.identity.userId,
      context.identity.tokenId,
    );
  setSession(
    context.reply,
    await context.users.createSession(user.id, context.config.signingKey),
    context.config.secureCookies,
  );
  return { __typename: 'AuthPayload' as const, user };
}
builder.queryType({
  fields: (t) => ({
    healthCheck: t.string({ resolve: () => 'ok' }),
    me: t.field({
      type: UserResult,
      resolve: async (_, _args, ctx) =>
        ctx.identity
          ? ctx.users.getUserById(ctx.identity.userId)
          : unauthorized(),
    }),
    allTimeEntries: t.field({
      type: Connection,
      nullable: true,
      resolve: async (_, _args, ctx) => {
        if (!ctx.reports)
          throw new GraphQLError('Login required', {
            extensions: { code: 'UNAUTHENTICATED' },
          });
        return {
          cursor: '0',
          hasMore: false,
          logEntries: await ctx.reports.getEntries(),
        };
      },
    }),
  }),
});
builder.mutationType({
  fields: (t) => ({
    signup: t.field({
      type: SignupResult,
      args: {
        username: t.arg.string({ required: true }),
        password: t.arg.string({ required: true }),
      },
      resolve: async (_, args, ctx) => {
        try {
          return await login(
            ctx,
            await ctx.users.createUser(args.username, args.password),
          );
        } catch (error) {
          return failure('SignupError', error, 'Could not create account', ctx);
        }
      },
    }),
    login: t.field({
      type: LoginResult,
      args: {
        username: t.arg.string({ required: true }),
        password: t.arg.string({ required: true }),
      },
      resolve: async (_, args, ctx) => {
        try {
          return await login(
            ctx,
            await ctx.users.authenticateUser(args.username, args.password),
          );
        } catch (error) {
          return failure('LoginError', error, 'Could not log in', ctx);
        }
      },
    }),
    logout: t.field({
      type: LogoutResult,
      resolve: async (_, _args, ctx) => {
        if (!ctx.identity) {
          clearSession(ctx.reply, ctx.config.secureCookies);
          return unauthorized();
        }
        await ctx.users.removeRefreshToken(
          ctx.identity.userId,
          ctx.identity.tokenId,
        );
        clearSession(ctx.reply, ctx.config.secureCookies);
        return { __typename: 'LogoutPayload' as const, ok: true };
      },
    }),
    reportTime: t.field({
      type: ReportResult,
      args: {
        minutes: t.arg({ type: 'Minutes', required: true }),
        name: t.arg.string(),
      },
      resolve: async (_, args, ctx) => {
        if (!ctx.reports) return unauthorized();
        try {
          return await ctx.reports.createLog(args.minutes, args.name ?? '');
        } catch (error) {
          return failure('ReportTimeError', error, 'Could not save entry', ctx);
        }
      },
    }),
    deleteTime: t.field({
      type: DeleteResult,
      args: { id: t.arg.id({ required: true }) },
      resolve: async (_, args, ctx) => {
        if (!ctx.reports) return unauthorized();
        try {
          return await ctx.reports.deleteEntry(String(args.id));
        } catch (error) {
          return failure(
            'DeleteTimeError',
            error,
            'Could not delete entry',
            ctx,
          );
        }
      },
    }),
  }),
});
export const schema = builder.toSchema();
