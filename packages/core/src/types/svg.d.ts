/**
 * SVG Type Declarations for SVGR
 *
 * Enables TypeScript support for importing SVG files as React components
 */

declare module '*.svg' {
  import type * as React from 'react';

  export interface SVGProps extends React.SVGProps<SVGSVGElement> {
    title?: string;
    titleId?: string;
  }

  const ReactComponent: React.FC<SVGProps>;
  export default ReactComponent;
}

declare module '*.svg?react' {
  import type * as React from 'react';

  export interface SVGProps extends React.SVGProps<SVGSVGElement> {
    title?: string;
    titleId?: string;
  }

  const ReactComponent: React.FC<SVGProps>;
  export default ReactComponent;
}

declare module '*.svg?url' {
  const content: string;
  export default content;
}

declare module '*.svg?component' {
  import type * as React from 'react';

  export interface SVGProps extends React.SVGProps<SVGSVGElement> {
    title?: string;
    titleId?: string;
  }

  const ReactComponent: React.FC<SVGProps>;
  export default ReactComponent;
}

declare module '*.svg?inline' {
  const content: string;
  export default content;
}
