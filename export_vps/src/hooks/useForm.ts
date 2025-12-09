// ============================================================================
// OPTIMIZED FORM HOOKS
// ============================================================================
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

export interface FormField<T = any> {
  value: T;
  error?: string;
  touched: boolean;
  required?: boolean;
  validator?: (value: T) => string | undefined;
}

export interface FormState<T extends Record<string, any>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
}

export interface FormActions<T extends Record<string, any>> {
  setValue: (field: keyof T, value: T[keyof T]) => void;
  setValues: (values: Partial<T>) => void;
  setError: (field: keyof T, error: string) => void;
  setErrors: (errors: Partial<Record<keyof T, string>>) => void;
  setTouched: (field: keyof T, touched: boolean) => void;
  setTouchedAll: (touched: boolean) => void;
  reset: () => void;
  validate: () => boolean;
  validateField: (field: keyof T) => boolean;
  submit: (onSubmit: (values: T) => void | Promise<void>) => Promise<void>;
}

export interface FormConfig<T extends Record<string, any>> {
  initialValues: T;
  validators?: Partial<Record<keyof T, (value: T[keyof T]) => string | undefined>>;
  onSubmit?: (values: T) => void | Promise<void>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnSubmit?: boolean;
}

export function useForm<T extends Record<string, any>>(config: FormConfig<T>) {
  const {
    initialValues,
    validators = {},
    onSubmit,
    validateOnChange = true,
    validateOnBlur = true,
    validateOnSubmit = true,
  } = config;

  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialValuesRef = useRef(initialValues);

  // Check if form is dirty
  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValuesRef.current);
  }, [values]);

  // Check if form is valid
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  // Validate a single field
  const validateField = useCallback((field: keyof T): boolean => {
    const validator = validators[field];
    if (!validator) return true;

    const value = values[field];
    const error = validator(value);
    
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }));
      return false;
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
      return true;
    }
  }, [values, validators]);

  // Validate all fields
  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    Object.keys(validators).forEach((key) => {
      const field = key as keyof T;
      const validator = validators[field];
      if (!validator) return;

      const value = values[field];
      const error = validator(value);
      
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validators]);

  // Set a single field value
  const setValue = useCallback((field: keyof T, value: T[keyof T]) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    if (validateOnChange) {
      validateField(field);
    }
  }, [validateOnChange, validateField]);

  // Set multiple field values
  const setValuesMultiple = useCallback((newValues: Partial<T>) => {
    setValues(prev => ({ ...prev, ...newValues }));
    
    if (validateOnChange) {
      Object.keys(newValues).forEach((key) => {
        const field = key as keyof T;
        validateField(field);
      });
    }
  }, [validateOnChange, validateField]);

  // Set a single field error
  const setError = useCallback((field: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  // Set multiple field errors
  const setErrorsMultiple = useCallback((newErrors: Partial<Record<keyof T, string>>) => {
    setErrors(prev => ({ ...prev, ...newErrors }));
  }, []);

  // Set a single field touched state
  const setTouchedSingle = useCallback((field: keyof T, touched: boolean) => {
    setTouched(prev => ({ ...prev, [field]: touched }));
    
    if (validateOnBlur && touched) {
      validateField(field);
    }
  }, [validateOnBlur, validateField]);

  // Set all fields touched state
  const setTouchedAll = useCallback((touched: boolean) => {
    const newTouched: Partial<Record<keyof T, boolean>> = {};
    Object.keys(initialValues).forEach((key) => {
      newTouched[key as keyof T] = touched;
    });
    setTouched(newTouched);
  }, [initialValues]);

  // Reset form to initial values
  const reset = useCallback(() => {
    setValues(initialValuesRef.current);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, []);

  // Submit form
  const submit = useCallback(async (onSubmitFn?: (values: T) => void | Promise<void>) => {
    const submitFn = onSubmitFn || onSubmit;
    if (!submitFn) return;

    if (validateOnSubmit && !validate()) {
      setTouchedAll(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await submitFn(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validate, validateOnSubmit, setTouchedAll, onSubmit]);

  // Form state
  const formState: FormState<T> = {
    values,
    errors,
    touched,
    isValid,
    isDirty,
    isSubmitting,
  };

  // Form actions
  const formActions: FormActions<T> = {
    setValue,
    setValues: setValuesMultiple,
    setError,
    setErrors: setErrorsMultiple,
    setTouched: setTouchedSingle,
    setTouchedAll,
    reset,
    validate,
    validateField,
    submit,
  };

  return {
    ...formState,
    ...formActions,
  };
}

// Specialized form field hook
export function useFormField<T extends Record<string, any>, K extends keyof T>(
  form: ReturnType<typeof useForm<T>>,
  field: K
) {
  const value = form.values[field];
  const error = form.errors[field];
  const touched = form.touched[field];

  const setValue = useCallback((value: T[K]) => {
    form.setValue(field, value);
  }, [form, field]);

  const setError = useCallback((error: string) => {
    form.setError(field, error);
  }, [form, field]);

  const setTouched = useCallback((touched: boolean) => {
    form.setTouched(field, touched);
  }, [form, field]);

  const validate = useCallback(() => {
    return form.validateField(field);
  }, [form, field]);

  return {
    value,
    error,
    touched,
    setValue,
    setError,
    setTouched,
    validate,
    hasError: !!error,
    isTouched: !!touched,
  };
}

// Form validation utilities
export const useFormValidation = () => {
  const required = useCallback((value: any, message = 'This field is required'): string | undefined => {
    if (value === null || value === undefined || value === '') {
      return message;
    }
    return undefined;
  }, []);

  const email = useCallback((value: string, message = 'Invalid email format'): string | undefined => {
    if (!value) return undefined;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return message;
    }
    return undefined;
  }, []);

  const minLength = useCallback((min: number, message?: string) => {
    return (value: string): string | undefined => {
      if (!value) return undefined;
      if (value.length < min) {
        return message || `Minimum length is ${min} characters`;
      }
      return undefined;
    };
  }, []);

  const maxLength = useCallback((max: number, message?: string) => {
    return (value: string): string | undefined => {
      if (!value) return undefined;
      if (value.length > max) {
        return message || `Maximum length is ${max} characters`;
      }
      return undefined;
    };
  }, []);

  const pattern = useCallback((regex: RegExp, message: string) => {
    return (value: string): string | undefined => {
      if (!value) return undefined;
      if (!regex.test(value)) {
        return message;
      }
      return undefined;
    };
  }, []);

  const custom = useCallback(<T>(validator: (value: T) => string | undefined) => {
    return validator;
  }, []);

  return {
    required,
    email,
    minLength,
    maxLength,
    pattern,
    custom,
  };
};
