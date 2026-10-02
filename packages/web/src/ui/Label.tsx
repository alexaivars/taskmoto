import styled, { css } from 'styled-components';

const Label = styled.label<{ $required?: boolean }>`
  font-weight: 700;
  ${({ $required }) =>
    $required &&
    css`
      &:after {
        content: '*';
        position: relative;
        top: -0.125rem;
      }
    `}
`;

export default Label;
