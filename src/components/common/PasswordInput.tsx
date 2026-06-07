import { useState, type InputHTMLAttributes } from 'react';

/**
 * Password field with a show/hide toggle. Passes through all standard input
 * props (id, value, onChange, autoComplete, required, minLength, placeholder).
 */
type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export default function PasswordInput({ className, ...props }: Props) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={show ? 'text' : 'password'}
        className={`${className ?? 'field-input'} pr-11`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-200"
      >
        {show ? <IconEyeOff /> : <IconEye />}
      </button>
    </div>
  );
}

function IconEye() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconEyeOff() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M17.9 17.9A10.6 10.6 0 0 1 12 19c-7 0-11-7-11-7a18.5 18.5 0 0 1 5.1-5.9m3.2-1.5A10.6 10.6 0 0 1 12 5c7 0 11 7 11 7a18.5 18.5 0 0 1-2.2 3.2M9.9 4.2 19.8 19.8M1 1l22 22" />
    </svg>
  );
}
