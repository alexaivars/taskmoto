import { ReactElement } from 'react';
import styled, { DefaultTheme, StyledComponent } from 'styled-components';

import { ReactComponent as Trash } from './svg/icons8-trash-50.svg';

type SVGComponent = React.FunctionComponent<
  React.SVGProps<SVGSVGElement> & { title?: string }
>;

const styledSVG = (SVG: SVGComponent, defaultTitle: string) => styled(
  function SVGWrapper({
    title = defaultTitle,
    className,
  }: {
    title?: string;
    className?: string;
  }): ReactElement {
    return (
      <div className={className}>
        <SVG title={title} />
      </div>
    );
  }
)`
  width: 2rem;
  height: 2rem;
  & > svg {
    position: relative;
    left: -1px;
    width: 100%;
    height: 100%;
  }
`;

export type IconType = StyledComponent<
  ({
    title,
    className,
  }: {
    title?: string | undefined;
    className?: string | undefined;
  }) => ReactElement,
  DefaultTheme,
  Record<string, unknown>,
  never
>;

export const Remove: IconType = styledSVG(Trash, 'Delete');

export default {
  Remove,
};
