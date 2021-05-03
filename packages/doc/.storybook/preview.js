import { ThemeProvider } from "styled-components";
import { lightTheme } from "@taskmoto/web/src/ui/theme";
import GlobalStyle from "@taskmoto/web/src/ui/GlobalStyle";

export const decorators = [
  function WithStyles(Story) {
    return (
      <ThemeProvider theme={lightTheme}>
        <GlobalStyle />
        <Story />
      </ThemeProvider>
    );
  },
];

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};
