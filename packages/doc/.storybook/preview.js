import { ThemeProvider } from 'styled-components';
import { light } from '../../web/src/ui/theme';
import GlobalStyle from '../../web/src/ui/GlobalStyle';

export const decorators = [
  function WithStyles(Story) {
    return (
      <ThemeProvider theme={light}>
        <GlobalStyle />
        <Story />
      </ThemeProvider>
    );
  },
];

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};
