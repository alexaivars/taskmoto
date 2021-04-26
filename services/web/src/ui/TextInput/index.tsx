import React from "react";
import styled, { css, StyledComponent } from "styled-components";
import TextElement, { TextProps } from "./TextElement";
import SearchElement, { SearchProps } from "./SearchElement";
import TextAreaElement, { TextAreaProps } from "./TextAreaElement";
import {color, focus, background } from "ui/styles";

type ElementProps = TextProps | SearchProps | TextAreaProps;

const TextInputRefRenderFunction: React.ForwardRefRenderFunction<
  HTMLInputElement | HTMLTextAreaElement,
  ElementProps
> = (
  props: ElementProps,
  ref: React.RefObject<HTMLInputElement & HTMLTextAreaElement>
) => {
  switch (props.type) {
    case "textarea":
      return <TextAreaElement {...props} ref={ref} />;
    case "search":
      return <SearchElement {...props} ref={ref} />;
    default:
      return <TextElement {...props} ref={ref} />;
  }
};

const TextInputComponent = React.forwardRef(TextInputRefRenderFunction);

type TextInputProps = ElementProps & { variant?: "success" | "failure" };

const TextInput = styled(TextInputComponent)<TextInputProps>`
  ${({theme}) => background(theme.primary)}
  width: 100%;
  border: 1px solid ${(props) => props.theme.primaryDark};
  border-radius: 0.25rem;
  padding: calc(0.75rem - 1px) calc(1rem - 1px);
  ${(props) =>
    props.type === "textarea" &&
    css`
      resize: ${props.resize ? "vertical" : "none"};
      min-height: 2.75rem;
  `}

  ${({theme, variant}) => {
    switch(variant){
      case "success":
        return focus(theme.success);
      case "failure":
        return focus(theme.error);
      default:
        return focus(theme.primary);
    }
  }}

  &::placeholder {
    color: ${(props) => props.theme.text};
    opacity: 0.7;
    font-style: italic;
  }

  &:disabled {
    opacity: 0.5;
  }
  ${({ type }) =>
    type === "search" &&
    css`
      padding-right: 2.375rem;
      &::-ms-clear {
        display: none;
        height: 0;
        width: 0;
      }
    `}
`;

// const TypeScriptTestCases = () => {
//   var ref = React.useRef<HTMLInputElement & HTMLTextAreaElement>(null);
//   return (
//     <>
//       <TextInput />
//       <TextInput type="password" />
//       <TextInput type="search" />
//       <TextInput type="text" />
//       <TextInput type="text" ref={ref} />
//       <TextInput type="textarea" />
//       <TextInput type="textarea" resize="true" value="foo" />
//       <TextInput type="textarea" ref={ref} />
//     </>
//   );
// };

export default TextInput;
