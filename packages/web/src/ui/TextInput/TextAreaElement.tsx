import React, { TextareaHTMLAttributes } from "react";

export type TextAreaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "type"
> & {
  type: "textarea";
  value?: string;
  resize?: "true" | true | "false" | false;
};

const TEXTAREA_BORDER_HEIGHT = 2;
const TEXTAREA_ROWS_DEFAULT = 3;

const DynamicTextAreaElementRefRenderFunction: React.ForwardRefRenderFunction<
  HTMLTextAreaElement,
  TextAreaProps
> = (
  { value, style, onChange, rows = TEXTAREA_ROWS_DEFAULT, ...props },
  forwardedRef
): React.ReactElement<"textarea"> => {
  const ref = React.useRef<HTMLTextAreaElement>(
    document.createElement("textarea")
  );

  React.useImperativeHandle(forwardedRef, () => ref.current);

  const [text, setText] = React.useState<string | undefined>(value);
  const [textAreaHeight, setTextAreaHeight] = React.useState<string>("auto");
  const [wrapperHeight, setWrapperHeight] = React.useState<string>("auto");
  const maxHeight =
    style?.maxHeight || ref?.current?.style?.maxHeight || ref?.current
      ? window.getComputedStyle(ref.current).getPropertyValue("max-height")
      : undefined;

  React.useEffect(() => {
    setText(value);
  }, [value]);

  React.useEffect(() => {
    setWrapperHeight(`${ref.current.scrollHeight + TEXTAREA_BORDER_HEIGHT}px`);
    setTextAreaHeight(`${ref.current.scrollHeight + TEXTAREA_BORDER_HEIGHT}px`);
  }, [text]);

  const onChangeHandler = React.useCallback(
    (event) => {
      setTextAreaHeight("auto");
      setWrapperHeight(
        `${ref.current.scrollHeight + TEXTAREA_BORDER_HEIGHT}px`
      );
      setText(event.target.value);

      if (onChange) {
        onChange(event);
      }
    },
    [onChange, ref]
  );

  const mergedStyle = React.useMemo(
    () => ({
      ...style,
      height: textAreaHeight,
      display: "block",
    }),
    [textAreaHeight, style]
  );

  const wrapperStyle = React.useMemo(
    () => ({
      height: wrapperHeight,
      maxHeight,
    }),
    [wrapperHeight, maxHeight]
  );

  return (
    <div style={wrapperStyle}>
      <textarea
        {...props}
        rows={2}
        value={value}
        onChange={onChangeHandler}
        style={mergedStyle}
        ref={ref}
      />
    </div>
  );
};

const StaticTextAreaElementRefRenderFunction: React.ForwardRefRenderFunction<
  HTMLTextAreaElement,
  TextAreaProps
> = (
  { rows = TEXTAREA_ROWS_DEFAULT, ...props },
  ref
): React.ReactElement<"textarea"> => (
  <textarea {...props} ref={ref} rows={rows || TEXTAREA_ROWS_DEFAULT} />
);

export const TextAreaElementRefRenderFunction: React.ForwardRefRenderFunction<
  HTMLTextAreaElement,
  TextAreaProps
> = ({ rows = TEXTAREA_ROWS_DEFAULT, ...props }, ref) =>
  props.resize === "true" || props.resize === true
    ? DynamicTextAreaElementRefRenderFunction(props, ref)
    : StaticTextAreaElementRefRenderFunction(props, ref);

const TextAreaElement = React.forwardRef(TextAreaElementRefRenderFunction);

export default TextAreaElement;
