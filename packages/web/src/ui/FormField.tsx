import React from 'react';
import styled, { DefaultTheme } from 'styled-components';
import Label from './Label';

const objectFromEntries = (
  entries: [string, string | boolean | undefined][]
): { [key: string]: string | boolean } =>
  entries.reduce(
    (acc, [key, value]) =>
      value !== undefined ? { ...acc, [key]: value } : acc,
    {}
  );

export type FormFieldProps = {
  description?: string;
  error?: string;
  id: string;
  label: string;
  required?: boolean;
  theme?: DefaultTheme;
  className?: string;
  children?: React.ReactElement;
};

const FormFieldComponent: React.FunctionComponent<FormFieldProps> = ({
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
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {description && <p>{description}</p>}
      {children &&
        React.cloneElement(
          children,
          objectFromEntries([
            ['id', id],
            ['data-required', required],
            [
              'aria-describedby',
              error
                ? `${id}-error`
                : description
                ? `${id}-description`
                : undefined,
            ],
            ['variant', error ? 'failure' : undefined],
          ])
        )}
      {error && (
        <p className="error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
};

export const FormField = styled(FormFieldComponent)`
  & > * + * {
    margin-top: 0.25rem;
  }

  & > .error {
    color: ${({ theme }) => theme.error};
  }
`;

export default FormField;
