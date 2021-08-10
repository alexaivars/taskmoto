import {
  css,
  DefaultTheme,
  FlattenSimpleInterpolation,
} from 'styled-components';
import { lighten, readableColor, tint } from 'polished';

type ThemeValue = ((theme: DefaultTheme) => string) | string;

export function color(color: string): FlattenSimpleInterpolation {
  return css`
    & {
      color: ${readableColor(color)};
    }
  `;
}

export function background(
  color: string,
  tintBackground?: boolean
): FlattenSimpleInterpolation {
  const bg = tintBackground ? tint(0.95, color) : color;
  return css`
    & {
      color: ${readableColor(bg)};
      background: ${bg};
    }
    & > div > svg {
      fill: ${readableColor(bg)};
    }
  `;
}

export function focus(color: string): FlattenSimpleInterpolation {
  return css`
    &:focus {
      position: relative;
      z-index: 1;
      outline: none;
      box-shadow: inset 0 0 0 1px ${lighten(0.1, color)},
        0 0 0 3px ${lighten(0.2, color)};
    }
  `;
}

export function variant<T extends string>(
  map: Record<T, ThemeValue>,
  defaultKey: T
) {
  return function variantResolver({
    theme,
    variant,
  }: {
    theme: DefaultTheme;
    variant?: T;
  }): string {
    const value: ThemeValue =
      map[
        variant === 'undefined' || variant === null || variant === undefined
          ? defaultKey
          : variant
      ];
    if (typeof value === 'function') {
      return value(theme);
    } else {
      return value;
    }
  };
}
