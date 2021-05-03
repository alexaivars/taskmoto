import React, {
  ForwardRefExoticComponent,
  InputHTMLAttributes,
  RefAttributes,
} from "react";

export type TextProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  type?:
    | "color"
    | "date"
    | "datetime-local"
    | "email"
    | "month"
    | "number"
    | "password"
    | "range"
    | "tel"
    | "text"
    | "time"
    | "url"
    | "week";
};

export type TextType = ForwardRefExoticComponent<
  Omit<InputHTMLAttributes<HTMLInputElement>, "type"> &
    TextProps &
    RefAttributes<HTMLInputElement>
>;

export const TextElementRefRenderFunction: React.ForwardRefRenderFunction<
  HTMLInputElement,
  TextProps
> = ({ type = "text", ...props }, ref): React.ReactElement<"input"> => (
  <input type={type} {...props} ref={ref} />
);

const TextElement: TextType = React.forwardRef<HTMLInputElement, TextProps>(
  TextElementRefRenderFunction
);

export default TextElement;
