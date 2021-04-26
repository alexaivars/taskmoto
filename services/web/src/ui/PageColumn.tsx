import React from 'react';
import styled, { css } from 'styled-components';
import { media } from 'ui/media';

const Layout = styled.div`
  ${media.greaterThan('tablet')} {
    display: flex;
    flex-wrap: wrap;
    margin-right: -1.5rem;
    margin-top: -1.5rem;
  }
`;

const LayoutItem = styled.div`
  width: 100%;

  & + & {
    margin-top: 1.5rem;
  }

  ${media.greaterThan('tablet')} {
    margin-top: 1.5rem;
    max-width: calc(50% - 1.5rem);
    margin-right: 1.5rem;
  }
`;

type ColumnProps = {
  /** Use multicolumn layout for large devices */
  multiColumn?: boolean;
  children: React.ReactNode;
  className?: string;
};

const Column = styled(function ColumnComponent({ multiColumn, children, className }: ColumnProps) {
  const content = React.useMemo(
    () =>
      multiColumn ? (
        <Layout>
          {React.Children.map(children, child => child && <LayoutItem>{child}</LayoutItem>)}
        </Layout>
      ) : (
        children
      ),
    [children, multiColumn],
  );

  return <div className={className}>{content}</div>;
}).withConfig<ColumnProps>({
  shouldForwardProp: (prop, defaultValidatorFn) => {
    return ['multiColumn'].includes(prop) || defaultValidatorFn(prop);
  },
})`
  & + & {
    margin-top: 1.5rem;
  }
  ${({ multiColumn }) =>
    !multiColumn &&
    css`
      & > * + * {
        margin-top: 1.5rem;
      }
    `}
`;

export default Column;

