import type { Handle } from 'remix/component';
import type { CurrentUser, LogEntry } from '@taskmoto/graphql/operations';
import { SubmitButton } from './public/submit-button.tsx';
import { PasskeyButton } from './public/passkey-button.tsx';
import { Document } from './document.tsx';
import { routes } from '../routes.ts';
export function AuthPage(
  handle: Handle<{ signup?: boolean; error?: string; username?: string }>,
) {
  return () => {
    const { signup, error, username } = handle.props;
    return (
      <Document
        title={signup ? 'Create account · Taskmoto' : 'Log in · Taskmoto'}
      >
        <header>
          <a href={routes.home.href()} className="brand">
            Taskmoto
          </a>
        </header>
        <section className="auth">
          <h1>{signup ? 'Create your account' : 'Welcome back'}</h1>
          <p>Keep a private record of your work.</p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <form
            data-rmx-key={signup ? 'signup' : 'login'}
            method="post"
            action={signup ? routes.register.href() : routes.signIn.href()}
          >
            <label>
              Username
              <input
                key="username"
                id="username"
                name="username"
                type="text"
                defaultValue={username}
                autoComplete="username"
                required
                minLength={3}
                maxLength={64}
              />
            </label>
            <label>
              Password
              <input
                key="password"
                id="password"
                name="password"
                type="password"
                autoComplete={signup ? 'new-password' : 'current-password'}
                required
                minLength={signup ? 6 : undefined}
                maxLength={1024}
                {...(signup ? { passwordrules: 'minlength: 6;' } : {})}
              />
            </label>
            {signup && (
              <>
                <p className="hint">
                  Use at least 6 characters for your password.
                </p>
                <label>
                  Confirm password
                  <input
                    key="confirm-password"
                    id="confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    maxLength={1024}
                  />
                </label>
              </>
            )}
            <SubmitButton>{signup ? 'Create account' : 'Log in'}</SubmitButton>
          </form>
          <p className="hint">
            {signup
              ? 'Or enter a username above and create your account without a password.'
              : 'Or use a saved passkey without entering a password.'}
          </p>
          <PasskeyButton
            key={signup ? 'passkey-signup' : 'passkey-login'}
            mode={signup ? 'signup' : 'login'}
          />
          <p>
            {signup ? 'Already have an account? ' : 'New here? '}
            <a href={signup ? routes.login.href() : routes.signup.href()}>
              {signup ? 'Log in' : 'Create account'}
            </a>
          </p>
        </section>
      </Document>
    );
  };
}
export function WorklogPage(
  handle: Handle<{
    user: CurrentUser;
    entries: LogEntry[];
    error?: string;
    values?: { name: string; minutes: string };
  }>,
) {
  return () => {
    const { user, entries, error, values } = handle.props;
    const total = entries.reduce((sum, entry) => sum + entry.minutes, 0);
    return (
      <Document>
        <header>
          <a className="brand" href={routes.home.href()}>
            Taskmoto
          </a>
          <div className="account">
            <span>{user.username}</span>
            <form method="post" action={routes.logout.href()}>
              <button className="secondary" type="submit">
                Log out
              </button>
            </form>
          </div>
        </header>
        <section>
          <PasskeyButton key="passkey-enroll" mode="enroll" />
        </section>
        <section>
          <h1>Your work log</h1>
          <p>Record your work, then get back to it.</p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <form
            data-rmx-key={`report-${entries[0]?.id ?? 'empty'}`}
            key={`report-${entries[0]?.id ?? 'empty'}`}
            method="post"
            action={routes.report.href()}
            className="entry-form"
          >
            <label className="description">
              What did you work on?
              <input
                key="entry-name"
                name="name"
                defaultValue={values?.name}
                placeholder="Work description"
                maxLength={500}
                autoComplete="off"
              />
            </label>
            <label>
              Minutes
              <input
                key="entry-minutes"
                name="minutes"
                defaultValue={values?.minutes}
                type="number"
                required
                min={1}
                max={2147483647}
                step={1}
                inputMode="numeric"
              />
            </label>
            <SubmitButton>Log work</SubmitButton>
          </form>
        </section>
        <section>
          <div className="section-heading">
            <h2>Logged work</h2>
            <span>{total} minutes total</span>
          </div>
          {entries.length === 0 ? (
            <p className="empty">
              No entries yet. Log your first piece of work above.
            </p>
          ) : (
            <ul className="entries">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <div>
                    <strong>{entry.name || 'Work entry'}</strong>
                    <span>{entry.minutes} minutes</span>
                  </div>
                  <form
                    method="post"
                    action={routes.remove.href({ id: entry.id })}
                  >
                    <button
                      className="secondary"
                      type="submit"
                      aria-label={`Delete ${entry.name || 'work entry'}`}
                    >
                      Delete
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Document>
    );
  };
}
