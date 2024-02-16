import { SetValidationState, ValidatorFn } from '../validation';

export function min(minValue: number): ValidatorFn<string | Array<unknown>> {
  return (value: number | unknown, setState: SetValidationState) => {
    const valid =
      value === null || value === undefined || typeof value !== 'number' || value >= minValue;

    if (valid) {
      setState('VALID');
    } else {
      setState('INVALID', {
        min: {
          details: {
            current: value,
            min: minValue
          }
        }
      });
    }
  };
}
