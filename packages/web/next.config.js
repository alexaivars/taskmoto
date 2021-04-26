require("dotenv").config();

if (!process.env.JWT_ACCESS_TOKEN_PUBLIC) {
  throw new Error("Missing JWT_ACCESS_TOKEN_PUBLIC");
}

module.exports = {
  future: {
    webpack5: true,
  },
  serverRuntimeConfig: {
    jwtAccessTokenPublic: process.env.JWT_ACCESS_TOKEN_PUBLIC,
  },
};
