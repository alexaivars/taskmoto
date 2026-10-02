declare module '*.svg' {
  import { ReactElement, SVGProps } from 'react';
  const content: (props: SVGProps<SVGElement>) => ReactElement;
  export const ReactComponent: (props: SVGProps<SVGSVGElement>) => ReactElement;
  export default content;
}
