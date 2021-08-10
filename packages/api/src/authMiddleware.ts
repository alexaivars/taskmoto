import UserAPI from './datasources/UserAPI';
import jwt from 'jsonwebtoken';
import { NextFunction, Request, Response } from 'express';
import { setAuthCookies } from './auth';
import cookie from 'cookie';

export type AuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export function createAuthMiddleware(
  api: UserAPI,
  signingKey: string,
  verifyKey: string
): AuthMiddleware {
  return async function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const header = req.header('Cookie');

    if (!header) {
      return next();
    }

    const cookies = cookie.parse(header);
    const refreshToken = cookies['refresh-token'];
    const accessToken = cookies['access-token'];

    if (!accessToken && !refreshToken) {
      return next();
    }

    try {
      jwt.verify(accessToken, verifyKey, { algorithms: ['RS256'] });
      res.locals.userId = jwt.decode(accessToken)?.sub;
      return next();
    } catch (e) {
      console.log(e);
    }

    try {
      const { sub: userId, jti: tokenId } = jwt.decode(refreshToken) as {
        sub: string;
        jti: string;
      };
      jwt.verify(refreshToken, await api.getUserHash(userId));
      const iat = await api.getTimestamp();
      const newRefreshToken = await api.createRefreshToken(userId, iat);
      const newAccessToken = await api.createAccessToken(
        userId,
        signingKey,
        iat
      );
      await api.removeRefreshToken(userId, refreshToken);
      setAuthCookies(res, {
        refreshToken: newRefreshToken,
        accessToken: newAccessToken,
      });
      res.locals.userId = userId;
      res.locals.tokenId = tokenId;
    } catch (e) {
      console.log(e);
    }
    return next();
  };
}
