import { clientEntry, type Handle } from 'remix/component';
export const SubmitButton = clientEntry(
  import.meta.url,
  function SubmitButton(handle: Handle<{ children?: string }>) {
    let pending = false;
    handle.frame.addEventListener(
      'reloadStart',
      () => {
        pending = true;
        void handle.update();
      },
      { signal: handle.signal },
    );
    handle.frame.addEventListener(
      'reloadComplete',
      () => {
        pending = false;
        void handle.update();
      },
      { signal: handle.signal },
    );
    return () => (
      <button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? 'Saving…' : handle.props.children}
      </button>
    );
  },
);
