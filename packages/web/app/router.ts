import {
  createRouter,
  type Middleware,
  type MiddlewareContext,
} from 'remix/router';
import { render } from 'remix/middleware/render';
import { formData } from 'remix/middleware/form-data';
import { staticFiles } from 'remix/middleware/static';
import { assets } from './assets.ts';
import { apiUrl } from './api.ts';
import { routes } from './routes.ts';
import controller from './actions/controller.tsx';
const renderMiddleware = render({ assets });
const formMiddleware = formData({ maxFiles: 0, maxTotalSize: 65536 });
type AppContext = MiddlewareContext<
  [typeof renderMiddleware, typeof formMiddleware]
>;
declare module 'remix' {
  interface RouterTypes {
    context: AppContext;
  }
}
const boundary: Middleware = async (context, next) => {
  const responseHeaders = new Headers();
  if (context.request.method === 'POST') {
    const request = context.request;
    const expected = process.env.WEB_ORIGIN ?? new URL(request.url).origin;
    if (request.headers.get('origin') !== expected)
      return new Response('Origin is not allowed', { status: 403 });
    if (Number(request.headers.get('content-length') ?? 0) > 65536)
      return new Response('Request too large', { status: 413 });
    // Bound streamed and chunked bodies too, before either JSON or form parsing.
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 65536) {
          await reader.cancel();
          return new Response('Request too large', { status: 413 });
        }
        chunks.push(chunk.value);
      }
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    context.request = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body,
      signal: request.signal,
    });
  }
  try {
    const response = await next();
    response.headers.set('x-content-type-options', 'nosniff');
    response.headers.set('referrer-policy', 'same-origin');
    response.headers.set('x-frame-options', 'DENY');
    return response;
  } catch (error) {
    console.error('Web request failed', error);
    responseHeaders.set('content-type', 'text/plain');
    responseHeaders.set('cache-control', 'no-store');
    return new Response(
      'We could not complete that request. Please try again.',
      { status: 502, headers: responseHeaders },
    );
  }
};
export const router = createRouter<AppContext>({
  middleware: [
    boundary,
    staticFiles('./public', { index: false }),
    formMiddleware,
    renderMiddleware,
  ],
});
router.get('/health', async () => {
  let ok = false;
  try {
    const response = await fetch(new URL('/health', apiUrl), {
      signal: AbortSignal.timeout(2500),
    });
    ok = response.ok && (await response.json()).ok === true;
  } catch {
    // Readiness deliberately reveals no internal connection details.
  }
  return Response.json(
    { ok },
    {
      status: ok ? 200 : 503,
      headers: { 'cache-control': 'no-store' },
    },
  );
});
router.map(routes, controller);
