import { background } from './styles';
import styled, { DefaultTheme, StyledComponent } from 'styled-components';
import { ReactElement } from 'react';

const Navigation = styled.main`
  padding: 1rem 2rem;
  ${({ theme }) => background(theme.primary)};
`;

const Body = styled.main`
  padding: 1rem 2rem;
`;

const Header = styled(function HeaderComponent({
  title,
  className,
}: {
  title: string;
  className?: string;
}): ReactElement {
  return (
    <header className={className}>
      <h1>{title}</h1>
    </header>
  );
})`
  padding: 1rem 2rem;
  & > h1 {
    font-size: 2rem;
    line-height: 2.5rem;
    font-weight: bold;
  }
`;

const Page: StyledComponent<
  'main',
  DefaultTheme,
  Record<string, unknown>,
  never
> & {
  Body: typeof Body;
  Navigation: typeof Navigation;
  Header: typeof Header;
} = Object.assign(styled.div``, { Body, Navigation, Header });

export default Page;
