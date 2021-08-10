import React, { InputHTMLAttributes } from 'react';
import styled, { css, DefaultTheme, StyledComponent } from 'styled-components';

export type SearchProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> & { type: 'search' };

const ClearWrapper: StyledComponent<
  'div',
  DefaultTheme,
  Record<string, unknown>,
  never
> = styled.div`
  position: relative;
  display: inline-block;
  width: 100%;
`;

const ClearIcon = styled.div`
  position: absolute;
  display: block;
  width: 1.5rem;
  height: 1.5rem;
  right: 0.5rem;
  top: calc(50% - 0.75rem);
  z-index: 101;
  ${({ onClick }) =>
    Boolean(onClick) &&
    css`
      & {
        cursor: pointer;
      }
    `}

  & > i > svg > * {
    stroke: ${(props) => props.theme.text};
  }
`;

const ClearContainer = ({
  disabled,
  children,
  value,
}: {
  disabled?: boolean;
  children: React.ReactNode;
  value?: string | number | readonly string[];
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [show, setShow] = React.useState<boolean>(false);
  React.useEffect((): void => {
    setShow(!!value);
  }, [value]);

  React.useEffect(() => {
    const input: HTMLInputElement | null =
      ref?.current?.querySelector('input') || null;
    if (input) {
      const handleChange = (event: Event) => {
        setShow(!!(event.target as HTMLInputElement).value);
      };
      input.addEventListener('change', handleChange, false);
      input.addEventListener('input', handleChange, false);
      return () => {
        input.removeEventListener('change', handleChange, false);
        input.removeEventListener('input', handleChange, false);
      };
    }
  }, [ref, setShow]);

  const handleClear = React.useCallback(() => {
    const input: HTMLInputElement | null =
      ref?.current?.querySelector('input') || null;
    if (input) {
      const inputEvent: Event = new Event('input', { bubbles: true });
      const nativeInputValueSetter: ((v: unknown) => void) | undefined = (
        Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        ) as PropertyDescriptor
      ).set;
      nativeInputValueSetter?.call(input, '');
      input.dispatchEvent(inputEvent);
    }
  }, [ref]);

  return (
    <ClearWrapper ref={ref}>
      {children}
      {!disabled && show ? (
        <ClearIcon onClick={handleClear}>
          <div aria-label="clear search">(x)</div>
        </ClearIcon>
      ) : (
        <ClearIcon>
          <div aria-label="search">(Q)</div>
        </ClearIcon>
      )}
    </ClearWrapper>
  );
};

export const SearchElementRefRenderFunction: React.ForwardRefRenderFunction<
  HTMLInputElement,
  SearchProps
> = ({ type: _, ...props }: SearchProps, ref): React.ReactElement => (
  <ClearContainer
    disabled={props.disabled || props.readOnly}
    value={props.defaultValue || props.value}
  >
    <input type="text" {...props} ref={ref} />
  </ClearContainer>
);

// const SearchElement = React.forwardRef<HTMLInputElement, InputProps>(
const SearchElement = React.forwardRef(SearchElementRefRenderFunction);

export default SearchElement;
