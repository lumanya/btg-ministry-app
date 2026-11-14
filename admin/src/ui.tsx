import { createContext, ReactNode, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';

/* ---------- Toasts ---------- */

type Toast = { text: string; tone: 'ok' | 'error' };
const ToastContext = createContext<(text: string, tone?: Toast['tone']) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    setToast({ text, tone });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), tone === 'error' ? 6000 : 3000);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" role="status">
        {toast ? <div className={`toast ${toast.tone === 'error' ? 'error' : ''}`}>{toast.text}</div> : null}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/* ---------- Building blocks ---------- */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  small?: boolean;
  busy?: boolean;
};

export function Button({ variant = 'secondary', small, busy, className = '', children, onClick, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      aria-busy={busy || undefined}
      onClick={busy ? undefined : onClick}
      className={`btn ${variant === 'secondary' ? '' : variant} ${small ? 'small' : ''} ${className}`}>
      {children}
    </button>
  );
}

/** A delete button that asks for a second click instead of a pop-up. */
export function ConfirmButton({ label, confirmLabel, onConfirm, small = true }: { label: string; confirmLabel: string; onConfirm: () => void; small?: boolean }) {
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    if (!asking) return;
    const t = window.setTimeout(() => setAsking(false), 4000);
    return () => window.clearTimeout(t);
  }, [asking]);
  return (
    <Button
      variant="danger"
      small={small}
      onClick={() => {
        if (asking) {
          setAsking(false);
          onConfirm();
        } else setAsking(true);
      }}>
      {asking ? confirmLabel : label}
    </Button>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode;
}) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint ? (
        <span id={`${id}-hint`} className="hint">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={`${id}-error`} className="error">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function PageHead({ eyebrow, title, intro, actions }: { eyebrow?: string; title: string; intro?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div className="stack">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {intro ? <p className="muted">{intro}</p> : null}
      </div>
      {actions ? <div className="row wrap">{actions}</div> : null}
    </div>
  );
}

export function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="card empty">
      <img src="/eagle.png" alt="" />
      <h3>{title}</h3>
      <p className="muted">{text}</p>
      {action}
    </div>
  );
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="center" role="status">
      <div className="spinner" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function Segment<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segment" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
