import { css, FlattenSimpleInterpolation } from "styled-components";

import { lighten, readableColor, tint } from "polished";


export const color = (color: any): FlattenSimpleInterpolation => {
  console.log('>>', color);
  return css`
    & {
      color: ${readableColor( "red" /* color */ )};
    }
  `;
};

export const background = (color: string): FlattenSimpleInterpolation => {
  const bg = tint(0.95, color);
  return css`
    & {
      color: ${readableColor(bg)};
      background: ${bg}
    }
  `;
};

export const focus = (color: string): FlattenSimpleInterpolation => {
  return css`
    &:focus {
      position: relative;
      z-index: 1;
      outline: none;
      box-shadow: inset 0 0 0 1px ${lighten(0.1, color)},
        0 0 0 3px ${lighten(0.2, color)};
    }
  `;
};

