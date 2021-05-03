import React, {
  ButtonHTMLAttributes,
  ForwardRefExoticComponent,
  RefAttributes,
} from "react";
import styled, { DefaultTheme } from "styled-components";
import { focus, color } from "./styles";

export type ButtonElementProps = ButtonHTMLAttributes<HTMLButtonElement>;
export type ButtonElementType = ForwardRefExoticComponent<
  ButtonElementProps & RefAttributes<HTMLButtonElement>
>;
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "neutral";
};

export const ButttonElementRefRenderFunction: React.ForwardRefRenderFunction<
  HTMLButtonElement,
  ButtonElementProps
> = (props, ref): React.ReactElement<"button"> => (
  <button {...props} ref={ref} />
);

const ButttonElement: ButtonElementType = React.forwardRef<
  HTMLButtonElement,
  ButtonElementProps
>(ButttonElementRefRenderFunction);

type ThemeValue = ((theme: DefaultTheme) => string) | string;
function variant<T extends string>(map: Record<T, ThemeValue>, defaultKey: T) {
  return function variantResolver({
    theme,
    variant,
  }: {
    theme: DefaultTheme;
    variant?: T;
  }): string {
    const value: ThemeValue =
      map[
        variant === "undefined" || variant === null || variant === undefined
          ? defaultKey
          : variant
      ];
    if (typeof value === "function") {
      return value(theme);
    } else {
      return value;
    }
  };
}

const buttonColor = variant<NonNullable<ButtonProps["variant"]>>(
  {
    primary: (theme: DefaultTheme) => theme.primary,
    neutral: (theme: DefaultTheme) => theme.secondary,
  },
  "primary"
);

export const Button = styled(ButttonElement)<ButtonProps>`
  background-color: ${buttonColor};
  _border: 1px solid ${({ theme }) => theme.primary};
  border-radius: 0.25rem;
  cursor: pointer;
  padding: calc(0.75rem - 1px) calc(1rem - 1px);
  min-width: 2.75rem;
  text-align: center;
  ${(props) => color(buttonColor(props))}
  ${(props) => focus(buttonColor(props))}
`;

export default Button;
