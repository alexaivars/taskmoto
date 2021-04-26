import React, {
  ButtonHTMLAttributes,
  ForwardRefExoticComponent,
  RefAttributes,
} from "react";
import styled from "styled-components";
import { focus, color } from "./styles";

export type ButtonElementProps = ButtonHTMLAttributes<HTMLButtonElement>;
export type ButtonElementType = ForwardRefExoticComponent<
  ButtonElementProps & RefAttributes<HTMLButtonElement>
>;

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

const Button = styled(ButttonElement)<ButtonElementProps>`
  background-color: ${(props) => props.theme.primary};
  _border: 1px solid ${(props) => props.theme.primary};
  border-radius: 0.25rem;
  cursor: pointer;
  padding: calc(0.75rem - 1px) calc(1rem - 1px);
  min-width: 2.75rem;
  text-align: center;
  ${({theme}) => color(theme.primary)}
  ${({theme}) => focus(theme.primary)}
`;

export default Button;

// import { useHistory } from 'react-router-dom';
// import { useTranslation } from 'react-i18next';
// import { theme } from 'ui/utils/selectors';
// import { font, shadow } from 'ui/extensions';
// import Spinner from '../Spinner';
// import { track, TrackEvent } from 'lib/tracker';

// const color = theme('color', 'Button');
// const colorDisabled = theme('colorDisabled', 'Button');

// const borderColor = theme('borderColor', 'Button');
// const borderColorHover = theme('borderColorHover', 'Button');
// const borderColorDisabled = theme('borderColorDisabled', 'Button');

// const backgroundColor = theme('backgroundColor', 'Button');
// const backgroundColorHover = theme('backgroundColorHover', 'Button');
// const backgroundColorDisabled = theme('backgroundColorDisabled', 'Button');

// const focusBorderDefault = theme('FOCUS_BORDER', 'tokens');
// const focusShadowDefault = theme('FOCUS_SHADOW', 'tokens');
// const focusShadowFailure = theme('FOCUS_SHADOW_FAILURE', 'tokens');
// const focusShadowPrimary = theme('FOCUS_SHADOW_PRIMARY', 'tokens');
// const focusShadowNeutral = theme('FOCUS_SHADOW_NEUTRAL', 'tokens');

// export type ButtonVariant = 'default' | 'primary' | 'secondary' | 'danger' | 'animated' | 'neutral';

// type ButtonType = 'submit' | 'reset' | 'button';

// export type ButtonProps = {
//   style?: any;
//   ref?: React.RefObject<HTMLButtonElement & HTMLAnchorElement>;
//   asLink?: boolean;
//   children: React.ReactNode;
//   disabled?: boolean;
//   href?: string;
//   loading?: boolean;
//   shadow?: boolean;
//   onClick?: (event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
//   type?: ButtonType;
//   variant?: ButtonVariant;
//   trackEvent?: TrackEvent;
// };
// const ButtonText = styled.span``;

// // TODO: stop or remove spinner when not visible
// const LoaderWrapper = styled.span.withConfig({
//   shouldForwardProp: (prop, defaultValidatorFn) =>
//     !['loading'].includes(prop) && defaultValidatorFn(prop),
// })<{ loading: boolean }>`
//   position: relative;

//   > ${ButtonText} {
//     transition: opacity 0.2s 0.2s ease-out;
//     opacity: ${({ loading }) => (loading ? 0 : 1)};
//   }

//   > ${Spinner} {
//     transition: opacity 0.2s 0.2s ease-out;
//     opacity: ${({ loading }) => (loading ? 1 : 0)};
//     position: absolute;
//     left: calc(50% - 0.75rem);
//     top: calc(50% - 0.75rem);
//   }
// `;

// const ButtonComponent = React.forwardRef<HTMLButtonElement & HTMLAnchorElement, ButtonProps>(
//   ({ onClick, children, loading, shadow, asLink, trackEvent, ...props }, ref) => {
//     const { t } = useTranslation();
//     const history = useHistory();
//     const { href, variant, disabled } = props;
//     const As = href && !disabled && !loading ? 'a' : 'button';

//     const handleClick = React.useCallback(
//       (event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>): void => {
//         onClick && onClick(event);

//         if (trackEvent) {
//           track(trackEvent);
//         }

//         if (history && href && !href.startsWith('http') && !event.isDefaultPrevented()) {
//           event.preventDefault();
//           history.push(href);
//         }
//       },
//       [history, href, onClick, trackEvent],
//     );

//     return (
//       <As onClick={handleClick} ref={ref} {...props}>
//         {loading !== undefined ? (
//           <LoaderWrapper loading={loading}>
//             <Spinner
//               size={1.5}
//               aria-label={t('common_saving')}
//               aria-hidden={loading ? 'false' : 'true'}
//               variant={variant === 'primary' ? 'light' : undefined}
//             />
//             <ButtonText>{children}</ButtonText>
//           </LoaderWrapper>
//         ) : (
//           children
//         )}
//       </As>
//     );
//   },
// );

// const Button: StyledComponent<typeof ButtonComponent, any, ButtonProps, never> = styled(
//   ButtonComponent,
// ).attrs<ButtonProps>(({ loading, disabled, href }) => ({
//   disabled: loading === true ? true : disabled,
//   href: (disabled || loading) && href ? undefined : href,
//   loading,
// }))<ButtonProps>`
//   ${font('normal')};
//   ${shadow(1)};

//   background-color: ${backgroundColor};
//   border: 1px solid ${borderColor};
//   border-radius: 0.25rem;
//   color: ${color};
//   cursor: pointer;
//   padding: calc(0.75rem - 1px) calc(1rem - 1px);
//   min-width: 2.75rem;
//   /* inline-block is default for button but is needed when component is rendered as anchor tag*/
//   display: inline-block;
//   text-decoration: none;
//   text-align: center;

//   &:hover {
//     background-color: ${backgroundColorHover};
//     border-color: ${borderColorHover};
//     text-decoration: none;
//     color: ${color};
//     transition: all 0.15s ease;
//   }

//   /* dropped since it does not differ from hover right now
//     &:active { }
//   */

//   &:focus {
//     z-index: 1;
//     text-decoration: none;
//     color: ${color};
//     outline: none;
//     ${({ variant }) =>
//       (!variant || variant === 'default' || variant === 'animated') &&
//       css`
//         border-color: ${focusBorderDefault};
//         box-shadow: ${focusShadowDefault};
//       `}

//     ${({ variant }) =>
//       variant === 'primary' &&
//       css`
//         box-shadow: ${focusShadowPrimary};
//       `}

//     ${({ variant }) =>
//       variant === 'neutral' &&
//       css`
//         box-shadow: ${focusShadowNeutral};
//       `}

//     ${({ variant }) =>
//       variant === 'secondary' &&
//       css`
//         box-shadow: ${focusShadowDefault};
//       `}

//     ${({ variant }) =>
//       variant === 'danger' &&
//       css`
//         box-shadow: ${focusShadowFailure};
//       `}
//   }

//   &:disabled,
//   &[aria-disabled='true'] {
//     background-color: ${backgroundColorDisabled};
//     border-color: ${borderColorDisabled};
//     cursor: not-allowed;
//     color: ${colorDisabled};
//   }

//   & > i svg > * {
//     stroke: ${color};
//   }

//   ${({ asLink }) =>
//     asLink &&
//     css`
//       background: none;
//       border: none;
//       box-shadow: none;
//       color: ${backgroundColor};
//       padding: 0;

//       &:hover {
//         background-color: transparent;
//         border-color: transparent;
//         color: ${backgroundColorHover};
//       }

//       &:focus,
//       &:active {
//         box-shadow: none;
//         color: ${backgroundColorHover};
//       }
//     `}
// `;

// export default Button;

// export default function Button() {
//   return "[button]";
// }
