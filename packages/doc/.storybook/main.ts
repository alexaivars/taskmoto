import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  framework: '@storybook/nextjs-vite',
  stories: ['../../web/src/ui/**/*.stories.@(mdx|js|jsx|ts|tsx)'],
};

export default config;
