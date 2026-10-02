import svgr from 'vite-plugin-svgr';
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  viteFinal(config) {
    return { ...config, plugins: [...(config.plugins ?? []), svgr()] };
  },
  stories: ['../ui/**/*.stories.@(mdx|js|jsx|ts|tsx)'],
};

export default config;
