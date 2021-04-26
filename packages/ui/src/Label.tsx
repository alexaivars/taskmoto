import styled, {css} from "styled-components";

const Label = styled.label.withConfig({
  shouldForwardProp: (prop, defaultValidatorFn) =>
    !['required'].includes(prop) && defaultValidatorFn(prop),
})<{ required?: boolean }>`
  ${({ required }) =>
    required &&
    css`
      &:after {
        content: '*';
        position: relative;
        top: -0.125rem;
      }
    `}
`;

export default Label
