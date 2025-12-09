import { useState, useCallback, useMemo } from 'react';

export type ValidationRule<T = any> = {
  validator: (value: T) => boolean | string;
  message?: string;
};

export type FieldValidation<T = any> = {
  value: T;
  rules: ValidationRule<T>[];
  touched?: boolean;
  error?: string;
};

export type FormValidationState<T extends Record<string, any>> = {
  [K in keyof T]: FieldValidation<T[K]>;
};

export interface UseFormValidationOptions<T extends Record<string, any>> {
  initialValues: T;
  validationRules: Partial<{
    [K in keyof T]: ValidationRule<T[K]>[];
  }>;
  onSubmit: (values: T) => void | Promise<void>;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
}

export function useFormValidation<T extends Record<string, any>>({
  initialValues,
  validationRules,
  onSubmit,
  validateOnBlur = true,
  validateOnChange = false,
}: UseFormValidationOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate a single field
  const validateField = useCallback(
    (fieldName: keyof T, value: T[keyof T]): string | undefined => {
      const rules = validationRules[fieldName];
      if (!rules || rules.length === 0) return undefined;

      for (const rule of rules) {
        const result = rule.validator(value);
        if (result === false) {
          return rule.message || `Ungültiger Wert für ${String(fieldName)}`;
        }
        if (typeof result === 'string') {
          return result;
        }
      }

      return undefined;
    },
    [validationRules]
  );

  // Validate all fields
  const validateAll = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    Object.keys(values).forEach((key) => {
      const fieldName = key as keyof T;
      const error = validateField(fieldName, values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validateField]);

  // Handle field change
  const handleChange = useCallback(
    (fieldName: keyof T) => (value: T[keyof T]) => {
      setValues((prev) => ({ ...prev, [fieldName]: value }));

      // Clear error when user starts typing
      if (errors[fieldName]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });
      }

      // Validate on change if enabled
      if (validateOnChange && touched[fieldName]) {
        const error = validateField(fieldName, value);
        if (error) {
          setErrors((prev) => ({ ...prev, [fieldName]: error }));
        }
      }
    },
    [errors, touched, validateField, validateOnChange]
  );

  // Handle field blur
  const handleBlur = useCallback(
    (fieldName: keyof T) => () => {
      setTouched((prev) => ({ ...prev, [fieldName]: true }));

      if (validateOnBlur) {
        const error = validateField(fieldName, values[fieldName]);
        if (error) {
          setErrors((prev) => ({ ...prev, [fieldName]: error }));
        } else {
          setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[fieldName];
            return newErrors;
          });
        }
      }
    },
    [values, validateField, validateOnBlur]
  );

  // Handle form submit
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      // Mark all fields as touched
      const allTouched: Partial<Record<keyof T, boolean>> = {};
      Object.keys(values).forEach((key) => {
        allTouched[key as keyof T] = true;
      });
      setTouched(allTouched);

      // Validate all fields
      if (!validateAll()) {
        return;
      }

      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validateAll, onSubmit]
  );

  // Reset form
  const reset = useCallback(() => {
    setValues(initialValues);
    setTouched({});
    setErrors({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Get field props for easy use in components
  const getFieldProps = useCallback(
    (fieldName: keyof T) => ({
      value: values[fieldName],
      onChange: handleChange(fieldName),
      onBlur: handleBlur(fieldName),
      error: errors[fieldName],
      touched: touched[fieldName],
      isValid: touched[fieldName] && !errors[fieldName],
    }),
    [values, errors, touched, handleChange, handleBlur]
  );

  // Check if form is valid
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  // Get all errors as array
  const allErrors = useMemo(() => {
    return Object.entries(errors).map(([field, error]) => ({
      field,
      error: error as string,
    }));
  }, [errors]);

  return {
    values,
    errors,
    touched,
    isValid,
    isSubmitting,
    allErrors,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    getFieldProps,
    setValues,
    setErrors,
    validateField,
    validateAll,
  };
}

// Common validation rules
export const validationRules = {
  required: <T,>(message?: string): ValidationRule<T> => ({
    validator: (value: T) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string' && value.trim() === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    },
    message: message || 'Dieses Feld ist erforderlich',
  }),

  email: (message?: string): ValidationRule<string> => ({
    validator: (value: string) => {
      if (!value) return true; // Use required rule for empty values
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value) || (message || 'Ungültige E-Mail-Adresse');
    },
    message: message || 'Ungültige E-Mail-Adresse',
  }),

  minLength: (min: number, message?: string): ValidationRule<string> => ({
    validator: (value: string) => {
      if (!value) return true; // Use required rule for empty values
      return value.length >= min || (message || `Mindestens ${min} Zeichen erforderlich`);
    },
    message: message || `Mindestens ${min} Zeichen erforderlich`,
  }),

  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    validator: (value: string) => {
      if (!value) return true; // Use required rule for empty values
      return value.length <= max || (message || `Maximal ${max} Zeichen erlaubt`);
    },
    message: message || `Maximal ${max} Zeichen erlaubt`,
  }),

  url: (message?: string): ValidationRule<string> => ({
    validator: (value: string) => {
      if (!value) return true; // Use required rule for empty values
      try {
        new URL(value);
        return true;
      } catch {
        return message || 'Ungültige URL';
      }
    },
    message: message || 'Ungültige URL',
  }),

  phone: (message?: string): ValidationRule<string> => ({
    validator: (value: string) => {
      if (!value) return true; // Use required rule for empty values
      const phoneRegex = /^[\d\s\+\-\(\)]+$/;
      return phoneRegex.test(value) || (message || 'Ungültige Telefonnummer');
    },
    message: message || 'Ungültige Telefonnummer',
  }),

  pattern: (pattern: RegExp, message?: string): ValidationRule<string> => ({
    validator: (value: string) => {
      if (!value) return true; // Use required rule for empty values
      return pattern.test(value) || (message || 'Ungültiges Format');
    },
    message: message || 'Ungültiges Format',
  }),
};







