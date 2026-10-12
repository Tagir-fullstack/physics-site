import { useEffect } from 'react';

/** Adds a client-side confirmation to Clerk's hosted sign-up form. */
export default function PasswordConfirmation() {
  useEffect(() => {
    const cleanups = new Map<HTMLFormElement, () => void>();
    const passwords = new WeakMap<HTMLFormElement, HTMLInputElement>();

    const scan = () => {
      for (const [form, cleanup] of cleanups) {
        if (!form.isConnected || form.querySelector('input[name="password"]') !== passwords.get(form)) {
          cleanup();
          cleanups.delete(form);
        }
      }
      document.querySelectorAll<HTMLFormElement>('.cl-signUp-root form').forEach((form) => {
        if (cleanups.has(form)) return;
        const password = form.querySelector<HTMLInputElement>('input[name="password"]');
        const field = password?.closest('.cl-formField');
        if (!password || !field) return;
        const row = field.parentElement;
        row?.classList.add('signup-password-row');

        const wrapper = document.createElement('div');
        wrapper.className = 'signup-password-confirmation';
        const label = document.createElement('label');
        label.textContent = 'Повторите пароль';
        const input = document.createElement('input');
        input.id = `signup-confirm-${crypto.randomUUID()}`;
        input.type = 'password';
        input.autocomplete = 'new-password';
        input.required = true;
        input.placeholder = 'Введите пароль ещё раз';
        label.htmlFor = input.id;
        const hint = document.createElement('p');
        hint.id = `${input.id}-hint`;
        hint.setAttribute('aria-live', 'polite');
        input.setAttribute('aria-describedby', hint.id);
        wrapper.append(label, input, hint);
        field.after(wrapper);

        const validate = () => {
          const error = !input.value ? 'Повторите пароль.' : input.value !== password.value ? 'Пароли не совпадают.' : '';
          input.setCustomValidity(error);
          input.setAttribute('aria-invalid', String(Boolean(error)));
          if (hint.textContent !== (input.value ? error : '')) hint.textContent = input.value ? error : '';
          return !error;
        };
        const guard = (event: Event) => {
          if (event.type === 'click') {
            const target = event.target;
            if (!(target instanceof Element) || !target.closest('button[type="submit"], .cl-formButtonPrimary')) return;
          }
          if (!validate()) {
            event.preventDefault();
            event.stopImmediatePropagation();
            input.reportValidity();
            input.focus();
          }
        };
        input.addEventListener('input', validate);
        password.addEventListener('input', validate);
        form.addEventListener('submit', guard, true);
        form.addEventListener('click', guard, true);
        validate();
        passwords.set(form, password);
        cleanups.set(form, () => {
          input.value = '';
          input.removeEventListener('input', validate);
          password.removeEventListener('input', validate);
          form.removeEventListener('submit', guard, true);
          form.removeEventListener('click', guard, true);
          wrapper.remove();
          row?.classList.remove('signup-password-row');
        });
      });
    };
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    scan();
    return () => {
      observer.disconnect();
      cleanups.forEach((cleanup) => cleanup());
      cleanups.clear();
    };
  }, []);
  return null;
}
