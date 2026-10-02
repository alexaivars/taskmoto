import { clientEntry, on, type Handle } from 'remix/component';
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  WebAuthnAbortService,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';
import { routes } from '../../routes.ts';

export const PasskeyButton = clientEntry(
  import.meta.url,
  function PasskeyButton(
    handle: Handle<{ mode: 'signup' | 'login' | 'enroll' }>,
  ) {
    let supported: boolean | undefined;
    let pending = false;
    let error = '';
    let complete = false;
    let request: AbortController | undefined;
    function cancel() {
      request?.abort();
      if (pending) WebAuthnAbortService.cancelCeremony();
    }
    handle.signal.addEventListener('abort', cancel, { once: true });
    handle.queueTask(() => {
      supported = window.isSecureContext && browserSupportsWebAuthn();
      void handle.update();
    });
    return () => {
      const { mode } = handle.props;
      const ceremony = mode === 'login' ? 'authentication' : 'registration';
      return (
        <div className="passkey-action" data-rmx-key={`passkey-${mode}`}>
          <button
            type="button"
            className="secondary"
            disabled={!supported || pending || complete}
            aria-busy={pending}
            mix={on('click', async (event) => {
              if (pending) return;
              let username: string | undefined;
              if (mode === 'signup') {
                const input = event.currentTarget.ownerDocument.getElementById(
                  'username',
                ) as HTMLInputElement;
                if (!input.reportValidity()) return;
                username = input.value;
              }
              error = '';
              pending = true;
              request = new AbortController();
              void handle.update();
              try {
                // Keep native fetch and WebAuthn in the click handler for Safari's user gesture checks.
                const optionsResponse = await fetch(
                  routes.passkeys.href({ ceremony, step: 'options' }),
                  {
                    method: 'POST',
                    signal: request.signal,
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                      ...(username ? { username } : {}),
                      ...(mode === 'enroll' ? { enroll: true } : {}),
                    }),
                  },
                );
                const options = await optionsResponse.json();
                if (!optionsResponse.ok)
                  throw new Error(
                    options.error ?? 'Could not start passkey request.',
                  );
                request.signal.throwIfAborted();
                const response =
                  mode === 'login'
                    ? await startAuthentication({
                        optionsJSON:
                          options as PublicKeyCredentialRequestOptionsJSON,
                      })
                    : await startRegistration({
                        optionsJSON:
                          options as PublicKeyCredentialCreationOptionsJSON,
                      });
                const verification = await fetch(
                  routes.passkeys.href({ ceremony, step: 'verify' }),
                  {
                    method: 'POST',
                    signal: request.signal,
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(response),
                  },
                );
                const result = await verification.json();
                if (!verification.ok)
                  throw new Error(result.error ?? 'Could not verify passkey.');
                if (mode === 'enroll') complete = true;
                else window.location.assign(routes.home.href());
              } catch (cause) {
                error =
                  request.signal.aborted ||
                  (cause instanceof Error && cause.name === 'NotAllowedError')
                    ? 'Passkey request cancelled or timed out. You can try again.'
                    : cause instanceof Error
                      ? cause.message
                      : 'Could not complete the passkey request.';
              } finally {
                pending = false;
                void handle.update();
              }
            })}
          >
            {pending
              ? 'Waiting for your passkey…'
              : complete
                ? 'Passkey added'
                : mode === 'signup'
                  ? 'Create account with a passkey'
                  : mode === 'enroll'
                    ? 'Add a passkey'
                    : 'Log in with a passkey'}
          </button>
          {pending && (
            <button
              type="button"
              className="secondary"
              mix={on('click', cancel)}
            >
              Cancel
            </button>
          )}
          {supported === false && (
            <p className="hint">
              Passkeys require a supported browser and a secure connection.
            </p>
          )}
          {complete && (
            <p role="status" className="hint">
              You can use your passkey next time you log in.
            </p>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <noscript>
            <p className="hint">Enable JavaScript to use passkeys.</p>
          </noscript>
        </div>
      );
    };
  },
);
