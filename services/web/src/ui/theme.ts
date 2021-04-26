import { DefaultTheme } from "styled-components";

declare module "styled-components" {
  export interface DefaultTheme {
    error: string;
    errorDark: string;
    errorLight: string;
    primary: string;
    primaryDark: string;
    primaryLight: string;
    secondary: string;
    secondaryDark: string;
    secondaryLight: string;
    success: string;
    successDark: string;
    successLight: string;
    text: string;
    textFontFamily: string;
    warning: string;
    warningDark: string;
    warningLight: string;
  }
}

export const lightTheme: DefaultTheme = {
  error: "#ea0658",
  errorDark: "#880638",
  errorLight: "#fd9cb9",
  primary: "#4969ee", // "#c5cae9",
  primaryDark: "#97a0d8",
  primaryLight: "#f0f1f9",
  secondary: "#a5d6a7",
  secondaryDark: "#d7ffd9",
  secondaryLight: "#75a478",
  success: "#14c860",
  successDark: "#135a2f",
  successLight: "#a3ebc1",
  text: "#2c3647",
  textFontFamily:
    'Publik,Helvetica,Arial,"Nimbus Sans L","Bitstream Vera Sans",sans-serif',
  warning: "#fcb462",
  warningDark: "#704510",
  warningLight: "#fff1e0",
};
