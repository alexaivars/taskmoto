import jwt from 'jsonwebtoken';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type UserAPI from './datasources/UserAPI.ts';
import type { Config } from './config.ts';

export type Identity = { userId: string; tokenId: string };
export type Session = Identity & { accessToken: string; refreshToken: string };
export function setSession(
  reply: FastifyReply,
  session: Session,
  secure: boolean,
) {
  for (const name of ['accessToken', 'refreshToken'])
    reply.clearCookie(name, {
      path: '/graphql',
      httpOnly: true,
      sameSite: 'strict',
      secure,
    });
  const options = {
    path: '/',
    httpOnly: true,
    sameSite: 'strict' as const,
    secure,
  };
  reply.setCookie('accessToken', session.accessToken, {
    ...options,
    maxAge: 300,
  });
  reply.setCookie('refreshToken', session.refreshToken, {
    ...options,
    maxAge: 604800,
  });
}
export function clearSession(reply: FastifyReply, secure: boolean) {
  for (const name of ['accessToken', 'refreshToken']) {
    for (const path of ['/', '/graphql'])
      reply.clearCookie(name, {
        path,
        httpOnly: true,
        sameSite: 'strict',
        secure,
      });
  }
}
function claims(value: string | jwt.JwtPayload): Identity {
  if (
    typeof value === 'string' ||
    typeof value.sub !== 'string' ||
    typeof value.jti !== 'string'
  )
    throw new Error('Invalid session');
  return { userId: value.sub, tokenId: value.jti };
}
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
  users: UserAPI,
  config: Config,
): Promise<Identity | undefined> {
  const bearer = request.headers.authorization;
  const access = bearer?.startsWith('Bearer ')
    ? bearer.slice(7)
    : request.cookies.accessToken;
  const clockTimestamp = await users.getTimestamp();
  if (access) {
    try {
      const identity = claims(
        jwt.verify(access, config.publicKey, {
          algorithms: ['RS256'],
          clockTimestamp,
        }),
      );
      if (
        await users.store.exists(
          `USER:${identity.userId}:REFRESH_TOKEN:${identity.tokenId}`,
        )
      )
        return identity;
    } catch {
      /* Expired browser access can be renewed by a valid refresh session. */
    }
  }
  if (bearer) return undefined;
  const refresh = request.cookies.refreshToken;
  if (!refresh) return undefined;
  try {
    const identity = claims(jwt.decode(refresh) ?? '');
    jwt.verify(refresh, await users.getRefreshSecret(identity.userId), {
      algorithms: ['HS256'],
      clockTimestamp,
    });
    const session = await users.createSession(
      identity.userId,
      config.signingKey,
      { id: identity.tokenId, token: refresh },
    );
    setSession(reply, session, config.secureCookies);
    return { userId: session.userId, tokenId: session.tokenId };
  } catch {
    clearSession(reply, config.secureCookies);
    return undefined;
  }
}
