import { CookieOptions, Response } from "express";

export const setAuthCookies = (
  res: Response,
  tokens: {
    refreshToken: string;
    accessToken: string;
  }
): Response => {
  res.cookie("refresh-token", tokens.refreshToken, {
    path: "/graphql",
    httpOnly: true,
    sameSite: "strict",
    maxAge: 1000 * 60 * 60 * 24 * 7,
    secure: true,
  } as CookieOptions);

  res.cookie("access-token", tokens.accessToken, {
    httpOnly: false,
    sameSite: "strict",
    maxAge: 1000 * 60 * 5,
  } as CookieOptions);

  return res;
};

export const clearAuthCookies = (
  res: Response,
): Response => {
  res.cookie("refresh-token", 'deleted', {
    path: "/graphql",
    httpOnly: true,
    sameSite: "strict",
    maxAge: 0,
    secure: true,
  } as CookieOptions);

  res.cookie("access-token", 'deleted', {
    httpOnly: false,
    sameSite: "strict",
    maxAge: 0,
  } as CookieOptions);

  return res;
};

