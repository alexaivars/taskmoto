import type { Handle, RemixNode } from 'remix/component';
import { ImportMap } from 'remix/component/server';
import { scriptEntry } from '../assets.ts';
export function Document(
  handle: Handle<{ children?: RemixNode; title?: string }>,
) {
  return () => (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{handle.props.title ?? 'Taskmoto'}</title>
        <link rel="stylesheet" href="/style.css" />
        <ImportMap value={scriptEntry.importMap} />
        {scriptEntry.preloads.map((href) => (
          <link key={href} rel="modulepreload" href={href} />
        ))}
        <script type="module" src={scriptEntry.href}></script>
      </head>
      <body>
        <main>{handle.props.children}</main>
      </body>
    </html>
  );
}
