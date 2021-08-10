require('dotenv').config();

if (!process.env.JWT_ACCESS_TOKEN_PUBLIC) {
  throw new Error('Missing JWT_ACCESS_TOKEN_PUBLIC');
}

module.exports = {
  webpack5: true,
  serverRuntimeConfig: {
    jwtAccessTokenPublic: process.env.JWT_ACCESS_TOKEN_PUBLIC,
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            prettier: false,
            svgo: false,
            svgoConfig: {
              plugins: [{ removeViewBox: false }],
            },
            titleProp: true,
            ref: true,
          },
        },
        {
          loader: 'file-loader',
          options: {
            name: 'static/media/[name].[hash].[ext]',
          },
        },
      ],
      issuer: {
        and: [/\.(ts|tsx|js|jsx|md|mdx)$/],
      },
    });

    return config;
  },
};
