import { GraphQLRequestError } from '@taskmoto/graphql/client';
import { createController } from 'remix/router';
import {
  Login,
  Signup,
  Logout,
  Me,
  Entries,
  ReportTime,
  DeleteTime,
} from '@taskmoto/graphql/operations';
import { assets } from '../assets.ts';
import { apiClient, apiUrl } from '../api.ts';
import { routes } from '../routes.ts';
import { AuthPage, WorklogPage } from './pages.tsx';
const headers = () => new Headers({ 'cache-control': 'no-store' });
function redirect(location: string, responseHeaders: Headers) {
  responseHeaders.set('location', location);
  return new Response(null, { status: 303, headers: responseHeaders });
}
export default createController(routes, {
  actions: {
    async passkeys(ctx) {
      const { ceremony, step } = ctx.params;
      if (
        !['registration', 'authentication'].includes(ceremony) ||
        !['options', 'verify'].includes(step)
      )
        return new Response('Not found', { status: 404 });
      if (
        !ctx.request.headers.get('content-type')?.startsWith('application/json')
      )
        return new Response('Expected JSON', { status: 415 });
      const response = await fetch(
        new URL(`/passkeys/${ceremony}/${step}`, apiUrl),
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            origin: ctx.request.headers.get('origin') ?? '',
            cookie: ctx.request.headers.get('cookie') ?? '',
          },
          body: await ctx.request.text(),
          redirect: 'manual',
        },
      );
      const outgoing = headers();
      outgoing.set('content-type', 'application/json');
      for (const cookie of response.headers.getSetCookie())
        outgoing.append('set-cookie', cookie);
      return new Response(response.body, {
        status: response.status,
        headers: outgoing,
      });
    },
    async assets(ctx) {
      return (
        (await assets.fetch(ctx.request)) ??
        new Response('Not found', { status: 404 })
      );
    },
    async home(ctx) {
      const outgoing = headers();
      const api = apiClient(ctx.request, outgoing);
      const { me } = await api(Me, {});
      if (me.__typename !== 'User')
        return redirect(routes.login.href(), outgoing);
      const { allTimeEntries } = await api(Entries, {});
      return ctx.render(
        <WorklogPage user={me} entries={allTimeEntries?.logEntries ?? []} />,
        { headers: outgoing },
      );
    },
    login(ctx) {
      return ctx.render(<AuthPage />, { headers: headers() });
    },
    signup(ctx) {
      return ctx.render(<AuthPage signup />, { headers: headers() });
    },
    async signIn(ctx) {
      const outgoing = headers();
      const api = apiClient(ctx.request, outgoing);
      const { login } = await api(Login, {
        username: String(ctx.formData.get('username') ?? ''),
        password: String(ctx.formData.get('password') ?? ''),
      });
      if (login.__typename === 'AuthPayload')
        return redirect(routes.home.href(), outgoing);
      return ctx.render(
        <AuthPage
          username={String(ctx.formData.get('username') ?? '')}
          error={login.message}
        />,
        { status: 400, headers: outgoing },
      );
    },
    async register(ctx) {
      const outgoing = headers();
      const username = String(ctx.formData.get('username') ?? '');
      const password = String(ctx.formData.get('password') ?? '');
      const confirmation = String(ctx.formData.get('confirmPassword') ?? '');
      if (!confirmation || password !== confirmation)
        return ctx.render(
          <AuthPage signup username={username} error="Passwords must match." />,
          { status: 400, headers: outgoing },
        );
      const api = apiClient(ctx.request, outgoing);
      const { signup } = await api(Signup, {
        username,
        password,
      });
      if (signup.__typename === 'AuthPayload')
        return redirect(routes.home.href(), outgoing);
      return ctx.render(
        <AuthPage
          signup
          username={String(ctx.formData.get('username') ?? '')}
          error={signup.message}
        />,
        { status: 400, headers: outgoing },
      );
    },
    async logout(ctx) {
      const outgoing = headers();
      await apiClient(ctx.request, outgoing)(Logout, {});
      return redirect(routes.login.href(), outgoing);
    },
    async report(ctx) {
      const outgoing = headers();
      const api = apiClient(ctx.request, outgoing);
      const values = {
        name: String(ctx.formData.get('name') ?? ''),
        minutes: String(ctx.formData.get('minutes') ?? ''),
      };
      let errorMessage: string;
      try {
        const { reportTime } = await api(ReportTime, {
          minutes: Number(values.minutes),
          name: values.name,
        });
        if (reportTime.__typename === 'AuthError')
          return redirect(routes.login.href(), outgoing);
        if (reportTime.__typename === 'TimeEntry')
          return redirect(routes.home.href(), outgoing);
        errorMessage = reportTime.message;
      } catch (error) {
        if (
          !(error instanceof GraphQLRequestError) ||
          !error.message.includes('Minutes must be a positive integer')
        )
          throw error;
        errorMessage = 'Minutes must be a positive integer';
      }
      const { me } = await api(Me, {});
      if (me.__typename !== 'User')
        return redirect(routes.login.href(), outgoing);
      const { allTimeEntries } = await api(Entries, {});
      return ctx.render(
        <WorklogPage
          user={me}
          entries={allTimeEntries?.logEntries ?? []}
          error={errorMessage}
          values={values}
        />,
        { status: 400, headers: outgoing },
      );
    },
    async remove(ctx) {
      const outgoing = headers();
      const api = apiClient(ctx.request, outgoing);
      const { deleteTime } = await api(DeleteTime, { id: ctx.params.id });
      if (deleteTime.__typename === 'AuthError')
        return redirect(routes.login.href(), outgoing);
      if (deleteTime.__typename === 'TimeEntry')
        return redirect(routes.home.href(), outgoing);
      const { me } = await api(Me, {});
      if (me.__typename !== 'User')
        return redirect(routes.login.href(), outgoing);
      const { allTimeEntries } = await api(Entries, {});
      return ctx.render(
        <WorklogPage
          user={me}
          entries={allTimeEntries?.logEntries ?? []}
          error={deleteTime.message}
        />,
        { status: 400, headers: outgoing },
      );
    },
    async graphql(ctx) {
      if (
        !ctx.request.headers.get('content-type')?.startsWith('application/json')
      )
        return new Response('Expected JSON', { status: 415 });
      const requestHeaders = new Headers(ctx.request.headers);
      for (const name of [
        'host',
        'connection',
        'content-length',
        'transfer-encoding',
      ])
        requestHeaders.delete(name);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: await ctx.request.text(),
        redirect: 'manual',
      });
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('cache-control', 'no-store');
      return new Response(response.body, {
        status: response.status,
        headers: responseHeaders,
      });
    },
  },
});
