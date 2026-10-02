import styled from 'styled-components';
const Form = styled.form`
  & > * + * {
    margin-top: 1rem;
  }
`;

export default Form;
