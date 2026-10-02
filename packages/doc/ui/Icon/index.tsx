import { ReactElement } from 'react';
import styled from 'styled-components';

import Trash from './svg/icons8-trash-50.svg?react';

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
  },
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

export const Remove = styledSVG(Trash, 'Delete');
export type IconType = typeof Remove;

export default {
  Remove,
};
