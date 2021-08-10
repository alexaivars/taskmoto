import { createAuthMiddleware, AuthMiddleware } from './authMiddleware';
import jwt from 'jsonwebtoken';
import timekeeper from 'timekeeper';
import { Request, Response } from 'express';
import UserAPI from './datasources/UserAPI';

const TIMESTAMP = 1616959677323;
const ACCESS_TOKEN_SECRET = 'asdfghj';
const ACCESS_TOKEN_PUBLIC = 'fubar';
const REFRESH_TOKEN_SECRET = 'qwwerty';
const VALID_REFRESH_TOKEN = jwt.sign(
  {
    sub: '<user id>',
    iat: TIMESTAMP,
  },
  REFRESH_TOKEN_SECRET,
  { expiresIn: 300 }
);
const VALID_ACCESS_TOKEN = jwt.sign(
  {
    sub: '<user id>',
    iat: TIMESTAMP,
  },
  ACCESS_TOKEN_SECRET,
  { expiresIn: 3600 }
);

let middleware: AuthMiddleware, mockApi: UserAPI, req: Request, res: Response;

beforeEach(() => {
  mockApi = {
    getUserHash: jest.fn(() => REFRESH_TOKEN_SECRET),
    getTimestamp: jest.fn(() => TIMESTAMP),
    createRefreshToken: jest.fn(() => VALID_REFRESH_TOKEN),
    createAccessToken: jest.fn(() => VALID_ACCESS_TOKEN),
    removeRefreshToken: jest.fn(),
  } as unknown as UserAPI;
  timekeeper.freeze(TIMESTAMP);
  req = {
    header: jest.fn(
      (key: string) =>
        ({
          Cookie: `access-token=${VALID_ACCESS_TOKEN}; refresh-token=${VALID_REFRESH_TOKEN}`,
        }[key])
    ),
  } as unknown as Request;
  res = {
    cookie: jest.fn(),
    locals: {},
  } as unknown as Response;

  middleware = createAuthMiddleware(
    mockApi,
    ACCESS_TOKEN_SECRET,
    ACCESS_TOKEN_PUBLIC
  );
});

it('should not attach user id when there are no cookies', async () => {
  const next = jest.fn();
  await middleware({ header: jest.fn() } as unknown as Request, res, next);
  expect(next).toBeCalledTimes(1);
  expect(res.locals.userId).toBeUndefined();
});

it('should attach user id when there is a valid access token', async () => {
  const next = jest.fn();
  req.cookies = {
    'access-token': VALID_ACCESS_TOKEN,
  };
  await middleware(req, res, next);
  expect(next).toBeCalledTimes(1);
  expect(res.locals.userId).toEqual('<user id>');
});

it('should attach user id and update cookies when there is only a valid refresh token', async () => {
  const next = jest.fn();
  req = {
    header: jest.fn(
      (key: string) =>
        ({
          Cookie: `refresh-token=${VALID_REFRESH_TOKEN}`,
        }[key])
    ),
  } as unknown as Request;
  timekeeper.travel(TIMESTAMP + 3601);
  await middleware(req, res, next);
  expect(next).toBeCalledTimes(1);
  expect(res.locals.userId).toEqual('<user id>');
  expect((res.cookie as jest.Mock).mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        "refresh-token",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI8dXNlciBpZD4iLCJpYXQiOjE2MTY5NTk2NzczMjMsImV4cCI6MTYxNjk1OTY3NzYyM30.qraC0OXsmsh0if3JiuKBhqSTkg8Xi5TgEHos-Pa7I3w",
        Object {
          "httpOnly": true,
          "maxAge": 604800000,
          "path": "/graphql",
          "sameSite": "strict",
          "secure": true,
        },
      ],
      Array [
        "access-token",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI8dXNlciBpZD4iLCJpYXQiOjE2MTY5NTk2NzczMjMsImV4cCI6MTYxNjk1OTY4MDkyM30.fNky5km0Ihu-Qmo4lQTaVALlSlZ0POFXDIsBjVPtVu0",
        Object {
          "httpOnly": false,
          "maxAge": 300000,
          "sameSite": "strict",
        },
      ],
    ]
  `);
});
