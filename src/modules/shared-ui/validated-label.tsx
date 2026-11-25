'use client';

import {
  Children,
  type ComponentProps,
  type FormEvent,
  isValidElement,
  type ReactNode,
  useId,
  useState,
} from 'react';

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
type Props = ComponentProps<'label'> & { required?: boolean };

function containsInput(child: ReactNode): boolean {
  if (!isValidElement<{ children?: ReactNode; required?: boolean }>(child)) return false;
  if (child.props.required) return true;
  if (typeof child.type === 'string' && ['input', 'select', 'textarea'].includes(child.type))
    return true;
  return Children.toArray(child.props.children).some(containsInput);
}

function isRequired(child: ReactNode): boolean {
  if (!isValidElement<{ children?: ReactNode; required?: boolean }>(child)) return false;
  if (child.props.required) return true;
  return Children.toArray(child.props.children).some(isRequired);
}

function isControl(value: EventTarget): value is Control {
  return (
    value instanceof HTMLInputElement ||
    value instanceof HTMLTextAreaElement ||
    value instanceof HTMLSelectElement
  );
}

function messageFor(control: Control) {
  if (control.validity.valueMissing) return 'Este dato es obligatorio';
  if (control.validity.typeMismatch && control.type === 'email')
    return 'Ingresá un correo electrónico válido';
  if (control.validity.tooShort) return `Ingresá al menos ${control.minLength} caracteres`;
  if (control.validity.patternMismatch) return 'Revisá el formato ingresado';
  if (control.validity.rangeUnderflow) return 'El valor ingresado es demasiado bajo';
  if (control.validity.rangeOverflow) return 'El valor ingresado es demasiado alto';
  if (control.validity.stepMismatch) return 'Ingresá un valor permitido';
  return 'Revisá el dato ingresado';
}

/** Regla compartida: asterisco rojo y error debajo de cada campo obligatorio. */
export function ValidatedLabel({ children, required, ...props }: Props) {
  const [error, setError] = useState('');
  const errorId = useId();
  const all = Children.toArray(children);
  const index = all.findIndex(containsInput);
  const caption = index === -1 ? all : all.slice(0, index);
  const content = index === -1 ? [] : all.slice(index);
  const mandatory = required ?? all.some(isRequired);

  function check(control: Control, shouldShow: boolean) {
    const text = control.validity.valid || !shouldShow ? '' : messageFor(control);
    setError(text);
    if (text) {
      control.setAttribute('aria-invalid', 'true');
      control.setAttribute('aria-describedby', errorId);
    } else {
      control.removeAttribute('aria-invalid');
      if (control.getAttribute('aria-describedby') === errorId)
        control.removeAttribute('aria-describedby');
    }
  }

  function handleInvalid(event: FormEvent<HTMLLabelElement>) {
    if (!isControl(event.target)) return;
    event.preventDefault();
    check(event.target, true);
  }

  function handleBlur(event: FormEvent<HTMLLabelElement>) {
    if (isControl(event.target)) check(event.target, true);
  }

  function handleInput(event: FormEvent<HTMLLabelElement>) {
    if (isControl(event.target)) check(event.target, Boolean(error));
  }

  return (
    <label
      {...props}
      onInvalidCapture={handleInvalid}
      onBlurCapture={handleBlur}
      onInputCapture={handleInput}
      onChangeCapture={handleInput}
    >
      <span className="inline-flex flex-wrap items-baseline gap-1">
        {caption}
        {mandatory && (
          <span aria-hidden="true" className="font-bold text-red-600">
            *
          </span>
        )}
      </span>
      {content}
      {error && (
        <span
          id={errorId}
          role="alert"
          className="block text-[12px] font-medium leading-5 text-red-700"
        >
          {error}
        </span>
      )}
    </label>
  );
}
