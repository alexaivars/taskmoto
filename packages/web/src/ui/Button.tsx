import React, {
  ButtonHTMLAttributes,
  ForwardRefExoticComponent,
  RefAttributes,
} from 'react';

import styled, { css, DefaultTheme } from 'styled-components';
import { focus, background, variant } from './styles';

export type ButtonElementProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: React.ReactElement;
};

export type ButtonElementType = ForwardRefExoticComponent<
  ButtonElementProps & RefAttributes<HTMLButtonElement>
>;
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'neutral';
};

export const ButttonElementRefRenderFunction: React.ForwardRefRenderFunction<
  HTMLButtonElement,
  ButtonElementProps
> = (
  { children, icon, ...props }: ButtonElementProps,
  ref
): React.ReactElement<'button'> => (
  <button {...props} ref={ref}>
    {icon ? (
      <>
        {icon}
        {children && <span>{children}</span>}
      </>
    ) : (
      children
    )}
  </button>
);

const ButttonElement: ButtonElementType = React.forwardRef<
  HTMLButtonElement,
  ButtonElementProps
>(ButttonElementRefRenderFunction);

const buttonColor = variant<NonNullable<ButtonProps['variant']>>(
  {
    primary: (theme: DefaultTheme) => theme.primary,
    neutral: (theme: DefaultTheme) => theme.secondary,
  },
  'primary'
);

export const Button = styled(ButttonElement)<ButtonProps>`
  border-radius: 0.25rem;
  cursor: pointer;
  padding: calc(0.75rem - 1px);
  min-width: 2.5rem;
  min-height: 2.5rem;
  text-align: center;
  ${({ icon }) =>
    icon &&
    css`
      display: flex;
      justify-content: center;
      padding: calc(0.25rem);
      align-items: center;
      & > *:first-child {
        flex-shrink: 0;
        margin: auto;
      }
      & > *:not(:first-child) {
        padding-top: calc(0.5rem - 1px);
        padding-bottom: calc(0.5rem - 1px);
        padding-right: 0.5rem;
        padding-left: 0.25rem;
      }
    `}
  ${(props) => background(buttonColor(props))}
  ${(props) => focus(buttonColor(props))}
`;

export default Button;
