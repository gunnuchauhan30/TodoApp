import { InputHTMLAttributes, forwardRef } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const FormField = forwardRef<HTMLInputElement, Props>(({ label, error, id, ...rest }, ref) => {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div>
      <label htmlFor={inputId} className="label">
        {label}
      </label>
      <input
        id={inputId}
        ref={ref}
        className={`input ${error ? '!border-red-500' : ''}`}
        aria-invalid={!!error}
        {...rest}
      />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
});
FormField.displayName = 'FormField';
