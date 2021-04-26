import React from "react";
import styled, { DefaultTheme } from "styled-components";
import Label from "ui/Label";

const fromEntriesReducer = (
  acc: { [key: string]: any },
  [key, value]: [string, any]
) => ({ ...acc, [key]: value });

type FormFieldProps = {
  description?: string;
  error?: string;
  id: string;
  label: string;
  required?: boolean;
  theme?: DefaultTheme;
  className?: string;
  children?: React.ReactElement;
};

const FormField: React.FunctionComponent<FormFieldProps> = ({
  description,
  error,
  id,
  label,
  children,
  required,
  className,
}) => {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      {description && <p>{description}</p>}
      {React.cloneElement(
        children,
        [
          ["id", id],
          ["data-required", required],
          [
            "aria-describedby",
            error
              ? `${id}-error`
              : description
              ? `${id}-description`
              : undefined,
          ],
          ["variant", error ? "failure" : undefined],
        ]
          .filter(Boolean)
          .reduce(fromEntriesReducer, {})
      )}
      {error && <p id={`${id}-error`}>{error}</p>}
    </div>
  );
};

const StyledFormField = styled(FormField)`
  & > * + * {
    margin-top: 0.25rem;
  }
`;
export default StyledFormField;
