import styled from 'styled-components';
import { media } from './media';

const ButtonField = styled.div`
  & > * {
    width: 100%;
    display: block;
    text-align: center;
    margin: 0.75rem 0 0 0;
  }

  & > *:first-child {
    margin-top: 0;
  }

  ${media.greaterThan('phablet')} {
    display: flex;
    justify-content: flex-start;
    flex-direction: row-reverse;
    /* NOTE:
    * "justify-content: flex-end" wont work with IE11 and margin auto, the
    * result will be the that the container total width equals (100% + auto
    * margins) and content being pushed out of the parent container.
    */
    & > * {
      margin: 0 0 0 0.5rem;
      width: auto;
    }
    & > *:last-child {
      margin-left: 0rem;
    }
    & > *:nth-last-child(2):not(:first-child),
    & > *:first-child:last-child {
      margin-left: auto;
    }
  }
`;

export default ButtonField;

