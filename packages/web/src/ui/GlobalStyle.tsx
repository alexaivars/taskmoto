import { createGlobalStyle, css } from 'styled-components';
import { normalize } from 'styled-normalize';

const reset = css`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  a {
    text-decoration: none;
    color: inherit;
    cursor: pointer;
  }
  button {
    background-color: transparent;
    color: inherit;
    border-width: 0;
    padding: 0;
    cursor: pointer;
  }
  figure {
    margin: 0;
  }
  input::-moz-focus-inner {
    border: 0;
    padding: 0;
    margin: 0;
  }
  ul,
  ol,
  dd {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin: 0;
    font-size: inherit;
    font-weight: inherit;
  }
  p {
    margin: 0;
  }
  cite {
    font-style: normal;
  }
  fieldset {
    border-width: 0;
    padding: 0;
    margin: 0;
  }
`;

const typography = css`
  html {
    font-size: 16px;
  }
  body {
    font-sze: 1rem;
    font-family: ${(props) => props.theme.textFontFamily};
    font-weight: 400;
    line-height: 1.3;
    color: ${(props) => props.theme.text};
  }
`;
export const GlobalStyle = createGlobalStyle`
  ${normalize}
  ${reset}
  ${typography}
`;

export default GlobalStyle;
