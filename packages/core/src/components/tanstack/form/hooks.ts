import {
  type DeepKeys,
  type DeepValue,
  type FormApi,
  type FormOptions,
  type ValidationError,
  useForm as useTanStackForm,
} from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import React from 'react';
import { z } from 'zod';

// Enhanced form hook with additional features
export interface UseFormOptions<TFormData> extends Omit<FormOptions<TFormData>, 'onSubmit'> {
  onSubmit?: (values: TFormData) => void | Promise<void>;
  onError?: (errors: ValidationError[]) => void;
  validationSchema?: z.ZodType<TFormData>;
  mode?: 'onChange' | 'onBlur' | 'onSubmit';
  reValidateMode?: 'onChange' | 'onBlur' | 'onSubmit';
  resetOnSubmit?: boolean;
  persistKey?: string;
  persistDebounceMs?: number;
}

export function useForm<TFormData>({
  onSubmit,
  onError,
  validationSchema,
  mode = 'onChange',
  reValidateMode = 'onChange',
  resetOnSubmit = false,
  persistKey,
  persistDebounceMs = 500,
  ...options
}: UseFormOptions<TFormData>) {
  // Load persisted form data
  const loadPersistedData = (): Partial<TFormData> | undefined => {
    if (!persistKey || typeof window === 'undefined') return undefined;

    try {
      const saved = localStorage.getItem(`form-${persistKey}`);
      return saved ? JSON.parse(saved) : undefined;
    } catch {
      return undefined;
    }
  };

  const persistedData = loadPersistedData();

  const form = useTanStackForm<TFormData>({
    defaultValues: persistedData || options.defaultValues,
    onSubmit: async ({ value }) => {
      try {
        await onSubmit?.(value);

        if (resetOnSubmit) {
          form.reset();
        }

        // Clear persisted data on successful submit
        if (persistKey && typeof window !== 'undefined') {
          localStorage.removeItem(`form-${persistKey}`);
        }
      } catch (error) {
        console.error('Form submission error:', error);
        throw error;
      }
    },
    onSubmitInvalid: ({ formApi }) => {
      onError?.(formApi.state.errors);
    },
    validators: validationSchema
      ? {
          onChange: mode === 'onChange' ? zodValidator(validationSchema) : undefined,
          onBlur: mode === 'onBlur' ? zodValidator(validationSchema) : undefined,
          onSubmit: zodValidator(validationSchema),
        }
      : options.validators,
    ...options,
  });

  // Persist form data
  const persistTimeoutRef = React.useRef<NodeJS.Timeout>();

  React.useEffect(() => {
    if (!persistKey || typeof window === 'undefined') return;

    const persistData = () => {
      localStorage.setItem(`form-${persistKey}`, JSON.stringify(form.state.values));
    };

    // Clear existing timeout
    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current);
    }

    // Set new timeout
    persistTimeoutRef.current = setTimeout(persistData, persistDebounceMs);

    return () => {
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
      }
    };
  }, [form.state.values, persistKey, persistDebounceMs]);

  // Additional utilities
  const clearPersisted = () => {
    if (persistKey && typeof window !== 'undefined') {
      localStorage.removeItem(`form-${persistKey}`);
    }
  };

  const setFieldError = (field: DeepKeys<TFormData>, error: string) => {
    form.setFieldMeta(field, (prev) => ({
      ...prev,
      errors: [error],
    }));
  };

  const clearFieldError = (field: DeepKeys<TFormData>) => {
    form.setFieldMeta(field, (prev) => ({
      ...prev,
      errors: [],
    }));
  };

  const getFieldError = (field: DeepKeys<TFormData>): string | undefined => {
    const fieldMeta = form.getFieldMeta(field);
    return fieldMeta?.errors?.[0];
  };

  const isFieldDirty = (field: DeepKeys<TFormData>): boolean => {
    const fieldMeta = form.getFieldMeta(field);
    return fieldMeta?.isDirty ?? false;
  };

  const isFieldTouched = (field: DeepKeys<TFormData>): boolean => {
    const fieldMeta = form.getFieldMeta(field);
    return fieldMeta?.isTouched ?? false;
  };

  return {
    ...form,
    clearPersisted,
    setFieldError,
    clearFieldError,
    getFieldError,
    isFieldDirty,
    isFieldTouched,
  };
}

// Hook for form field state
export function useFieldState<TFormData, TName extends DeepKeys<TFormData>>(
  form: FormApi<TFormData>,
  name: TName
) {
  const [value, setValue] = React.useState<DeepValue<TFormData, TName>>(form.getFieldValue(name));
  const [error, setError] = React.useState<string | undefined>();
  const [isTouched, setIsTouched] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = form.store.subscribe(() => {
      const fieldValue = form.getFieldValue(name);
      const fieldMeta = form.getFieldMeta(name);

      setValue(fieldValue);
      setError(fieldMeta?.errors?.[0]);
      setIsTouched(fieldMeta?.isTouched ?? false);
      setIsDirty(fieldMeta?.isDirty ?? false);
    });

    return unsubscribe;
  }, [form, name]);

  return {
    value,
    error,
    isTouched,
    isDirty,
    setValue: (newValue: DeepValue<TFormData, TName>) => {
      form.setFieldValue(name, newValue);
    },
    setError: (newError: string | undefined) => {
      if (newError) {
        form.setFieldMeta(name, (prev) => ({
          ...prev,
          errors: [newError],
        }));
      } else {
        form.setFieldMeta(name, (prev) => ({
          ...prev,
          errors: [],
        }));
      }
    },
    setTouched: (touched = true) => {
      form.setFieldMeta(name, (prev) => ({
        ...prev,
        isTouched: touched,
      }));
    },
  };
}

// Hook for dependent fields
export function useDependentField<
  TFormData,
  TDependentField extends DeepKeys<TFormData>,
  TWatchFields extends DeepKeys<TFormData>[],
>(
  form: FormApi<TFormData>,
  dependentField: TDependentField,
  watchFields: TWatchFields,
  updateFn: (
    values: { [K in TWatchFields[number]]: DeepValue<TFormData, K> }
  ) => DeepValue<TFormData, TDependentField>
) {
  React.useEffect(() => {
    const values = {} as any;

    for (const field of watchFields) {
      values[field] = form.getFieldValue(field);
    }

    const newValue = updateFn(values);
    form.setFieldValue(dependentField, newValue);
  }, [form, dependentField, watchFields, updateFn]);
}

// Hook for form steps/wizard
export interface FormStep<TFormData> {
  id: string;
  title: string;
  description?: string;
  fields: DeepKeys<TFormData>[];
  validationSchema?: z.ZodType<Partial<TFormData>>;
}

export function useFormWizard<TFormData>(form: FormApi<TFormData>, steps: FormStep<TFormData>[]) {
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const currentStep = steps[currentStepIndex];

  const validateCurrentStep = async (): Promise<boolean> => {
    if (!currentStep.validationSchema) return true;

    const stepData: any = {};
    for (const field of currentStep.fields) {
      stepData[field] = form.getFieldValue(field);
    }

    try {
      await currentStep.validationSchema.parseAsync(stepData);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          const field = err.path.join('.') as DeepKeys<TFormData>;
          form.setFieldMeta(field, (prev) => ({
            ...prev,
            errors: [err.message],
          }));
        });
      }
      return false;
    }
  };

  const goToNextStep = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      return true;
    }
    return false;
  };

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      return true;
    }
    return false;
  };

  const goToStep = async (index: number) => {
    if (index < currentStepIndex) {
      setCurrentStepIndex(index);
      return true;
    }

    // Validate all steps up to the target
    for (let i = currentStepIndex; i < index; i++) {
      const isValid = await validateCurrentStep();
      if (!isValid) return false;
      if (i < index - 1) {
        setCurrentStepIndex(i + 1);
      }
    }

    setCurrentStepIndex(index);
    return true;
  };

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const getStepStatus = (index: number): 'complete' | 'current' | 'upcoming' => {
    if (index < currentStepIndex) return 'complete';
    if (index === currentStepIndex) return 'current';
    return 'upcoming';
  };

  return {
    currentStep,
    currentStepIndex,
    steps,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    isFirstStep,
    isLastStep,
    getStepStatus,
  };
}

// Hook for auto-save
export function useFormAutoSave<TFormData>(
  form: FormApi<TFormData>,
  saveFn: (values: TFormData) => Promise<void>,
  options?: {
    debounceMs?: number;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  }
) {
  const { debounceMs = 1000, onSuccess, onError } = options || {};
  const [isSaving, setIsSaving] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  const saveTimeoutRef = React.useRef<NodeJS.Timeout>();

  React.useEffect(() => {
    const save = async () => {
      setIsSaving(true);
      try {
        await saveFn(form.state.values);
        setLastSaved(new Date());
        onSuccess?.();
      } catch (error) {
        onError?.(error as Error);
      } finally {
        setIsSaving(false);
      }
    };

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Only save if form is dirty
    if (form.state.isDirty) {
      saveTimeoutRef.current = setTimeout(save, debounceMs);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [form.state.values, form.state.isDirty, saveFn, debounceMs, onSuccess, onError]);

  return {
    isSaving,
    lastSaved,
  };
}
