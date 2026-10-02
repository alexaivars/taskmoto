require('dotenv').config();

if (!process.env.JWT_ACCESS_TOKEN_PUBLIC) {
  throw new Error('Missing JWT_ACCESS_TOKEN_PUBLIC');
}

module.exports = {
  compiler: {
    styledComponents: true,
  },
  webpack(config) {
    const assetRule = config.module.rules.find((rule) =>
      rule.test?.test?.('.svg'),
    );
    if (assetRule) {
      assetRule.exclude = /.svg$/i;
    }
    config.module.rules.push({
      test: /\.svg$/,
      issuer: /\.[jt]sx?$/,
      use: [
        {
          loader: '@svgr/webpack',
          options: { titleProp: true, ref: true },
        },
      ],
    });

    return config;
  },
};
