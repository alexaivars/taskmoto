module.exports = {
  typescript: {
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      shouldRemoveUndefinedFromOptional: true,
      propFilter: prop => {
        return prop.parent
          ? !/node_modules/.test(prop.parent.fileName)
          : !['as', 'theme', 'forwardedAs'].includes(prop.name);
      },
    },
  },
  "stories": [
    "../src/**/*.stories.mdx",
    "../src/**/*.stories.@(js|jsx|ts|tsx)"
  ],
  "addons": [
    "@storybook/addon-links",
    "@storybook/addon-essentials"
  ]
}
