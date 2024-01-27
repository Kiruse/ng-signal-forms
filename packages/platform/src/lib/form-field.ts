import {
  computed,
  effect,
  Injector,
  isSignal,
  signal,
  Signal,
  WritableSignal,
} from '@angular/core';
import {
  computeErrors,
  computeErrorsArray,
  computeState,
  computeValidateState,
  computeValidators,
  InvalidDetails,
  ValidationErrors,
  ValidationState,
  Validator,
} from './validation';

export type DirtyState = 'PRISTINE' | 'DIRTY';
export type TouchedState = 'TOUCHED' | 'UNTOUCHED';

export type FormField<Value = unknown> = {
  __type: 'FormField';
  value: WritableSignal<Value>;
  errors: Signal<ValidationErrors>;
  errorsArray: Signal<InvalidDetails[]>;
  state: Signal<ValidationState>;
  valid: Signal<boolean>;
  dirtyState: Signal<DirtyState>;
  dirty: Signal<boolean>;
  touchedState: Signal<TouchedState>;
  touched: Signal<boolean>;
  hidden: Signal<boolean>;
  disabled: Signal<boolean>;
  markAsTouched: () => void;
  markAsDirty: () => void;
  reset: () => void;
  registerOnReset: (fn: (value: Value) => void) => void;
};

export type FormFieldOptions = {
  validators?: Validator<any>[];
  hidden?: () => boolean;
  disabled?: () => boolean;
};
export type FormFieldOptionsCreator<T> = (value: Signal<T>) => FormFieldOptions;

export function createFormField<Value>(
  value: Value | WritableSignal<Value>,
  options?: FormFieldOptions | FormFieldOptionsCreator<Value>,
  injector?: Injector
): FormField<Value> {
  const valueSignal =
    // needed until types for writable signal are fixed
    (
      typeof value === 'function' && isSignal(value) ? value : signal(value)
    ) as WritableSignal<Value>;
  const finalOptions =
    options && typeof options === 'function' ? options(valueSignal) : options;

  const validatorsSignal = computeValidators(
    valueSignal,
    finalOptions?.validators,
    injector
  );
  const validateStateSignal = computeValidateState(validatorsSignal);

  const errorsSignal = computeErrors(validateStateSignal);
  const errorsArraySignal = computeErrorsArray(validateStateSignal);

  const stateSignal = computeState(validateStateSignal);
  const validSignal = computed(() => stateSignal() === 'VALID');

  const touchedStateSignal = signal<TouchedState>('UNTOUCHED');
  const touchedSignal = computed(() => touchedStateSignal() === 'TOUCHED');
  const dirtyStateSignal = signal<DirtyState>('PRISTINE');
  const dirtySignal = computed(() => dirtyStateSignal() === 'DIRTY');
  const hiddenSignal = signal(false);
  const disabledSignal = signal(false);

  effect(
    () => {
      if (valueSignal()) {
        dirtyStateSignal.set('DIRTY');
      }
    },
    {
      allowSignalWrites: true,
      injector: injector,
    }
  );

  if (finalOptions?.hidden) {
    effect(
      () => {
        hiddenSignal.set(finalOptions!.hidden!());
      },
      {
        allowSignalWrites: true,
        injector: injector,
      }
    );
  }

  if (finalOptions?.disabled) {
    effect(
      () => {
        disabledSignal.set(finalOptions!.disabled!());
      },
      {
        allowSignalWrites: true,
        injector: injector,
      }
    );
  }

  const defaultValue =
    typeof value === 'function' && isSignal(value) ? value() : value;
  let onReset = (_value: Value) => {};

  return {
    __type: 'FormField',
    value: valueSignal,
    errors: errorsSignal,
    errorsArray: errorsArraySignal,
    state: stateSignal,
    valid: validSignal,
    touchedState: touchedStateSignal,
    touched: touchedSignal,
    dirtyState: dirtyStateSignal,
    dirty: dirtySignal,
    hidden: hiddenSignal,
    disabled: disabledSignal,
    markAsTouched: () => touchedStateSignal.set('TOUCHED'),
    markAsDirty: () => dirtyStateSignal.set('DIRTY'),
    registerOnReset: (fn: (value: Value) => void) => (onReset = fn),
    reset: () => {
      valueSignal.set(defaultValue);
      touchedStateSignal.set('UNTOUCHED');
      dirtyStateSignal.set('PRISTINE');
      onReset(defaultValue);
    },
  };
}
