import {
  type DeepKeys,
  type DeepValue,
  type FieldApi,
  type FieldOptions,
  type FormApi,
  type FormOptions,
  FormState,
  ValidationError,
  type Validator,
  useForm,
} from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import type React from 'react';
import type { z } from 'zod';
import { cn } from '../../../utils/cn';

export interface FormProps<TFormData> {
  children:
    | React.ReactNode
    | ((form: FormApi<TFormData, Validator<TFormData, unknown>>) => React.ReactNode);
  onSubmit: (values: TFormData) => void | Promise<void>;
  defaultValues?: Partial<TFormData>;
  validationSchema?: z.ZodType<TFormData>;
  options?: Omit<
    FormOptions<TFormData, Validator<TFormData, unknown>>,
    'onSubmit' | 'defaultValues'
  >;
  className?: string;
  debug?: boolean;
}

export function Form<TFormData>({
  children,
  onSubmit,
  defaultValues,
  validationSchema,
  options,
  className,
  debug = false,
}: FormProps<TFormData>) {
  const form = useForm<TFormData, Validator<TFormData, unknown>>({
    defaultValues: defaultValues as TFormData,
    onSubmit: async ({ value }) => {
      await onSubmit(value);
    },
    validators: validationSchema
      ? {
          onChange: zodValidator(validationSchema),
        }
      : undefined,
    ...options,
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className={className}
    >
      <form.Provider>
        {typeof children === 'function' ? children(form) : children}
        {debug && <FormDebugger form={form} />}
      </form.Provider>
    </form>
  );
}

// Field component with built-in error handling
export interface FieldProps<TFormData, TName extends DeepKeys<TFormData>> {
  name: TName;
  children: (
    field: FieldApi<TFormData, TName, any, any, DeepValue<TFormData, TName>>
  ) => React.ReactNode;
  validators?: FieldOptions<TFormData, TName, any, any, DeepValue<TFormData, TName>>['validators'];
  asyncDebounceMs?: number;
  preserveValue?: boolean;
}

export function Field<TFormData, TName extends DeepKeys<TFormData>>({
  name,
  children,
  validators,
  asyncDebounceMs,
  preserveValue,
}: FieldProps<TFormData, TName>) {
  const form = useForm<TFormData>();

  return (
    <form.Field
      name={name}
      validators={validators}
      asyncDebounceMs={asyncDebounceMs}
      preserveValue={preserveValue}
    >
      {children}
    </form.Field>
  );
}

// Pre-built field components
export interface InputFieldProps<TFormData, TName extends DeepKeys<TFormData>>
  extends FieldProps<TFormData, TName> {
  label?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  required?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  errorClassName?: string;
  showError?: boolean;
}

export function InputField<TFormData, TName extends DeepKeys<TFormData>>({
  name,
  label,
  placeholder,
  type = 'text',
  required,
  disabled,
  className,
  inputClassName,
  labelClassName,
  errorClassName,
  showError = true,
  validators,
  ...fieldProps
}: InputFieldProps<TFormData, TName>) {
  return (
    <Field name={name} validators={validators} {...fieldProps}>
      {(field) => (
        <div className={cn('space-y-2', className)}>
          {label && (
            <label
              htmlFor={field.name}
              className={cn(
                'block text-sm font-medium',
                required && "after:content-['*'] after:ml-0.5 after:text-destructive",
                labelClassName
              )}
            >
              {label}
            </label>
          )}
          <input
            id={field.name}
            name={field.name}
            type={type}
            value={(field.state.value as string) || ''}
            onChange={(e) => field.handleChange(e.target.value as DeepValue<TFormData, TName>)}
            onBlur={field.handleBlur}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            aria-invalid={field.state.meta.errors.length > 0}
            aria-describedby={
              field.state.meta.errors.length > 0 ? `${field.name}-error` : undefined
            }
            className={cn(
              'w-full px-3 py-2 border rounded-md',
              'focus:outline-none focus:ring-2 focus:ring-primary',
              field.state.meta.errors.length > 0 && 'border-destructive',
              disabled && 'opacity-50 cursor-not-allowed',
              inputClassName
            )}
          />
          {showError && field.state.meta.errors.length > 0 && (
            <p
              id={`${field.name}-error`}
              className={cn('text-sm text-destructive', errorClassName)}
            >
              {field.state.meta.errors.join(', ')}
            </p>
          )}
        </div>
      )}
    </Field>
  );
}

// Textarea field
export interface TextareaFieldProps<TFormData, TName extends DeepKeys<TFormData>>
  extends Omit<InputFieldProps<TFormData, TName>, 'type'> {
  rows?: number;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export function TextareaField<TFormData, TName extends DeepKeys<TFormData>>({
  name,
  label,
  placeholder,
  required,
  disabled,
  rows = 4,
  resize = 'vertical',
  className,
  inputClassName,
  labelClassName,
  errorClassName,
  showError = true,
  validators,
  ...fieldProps
}: TextareaFieldProps<TFormData, TName>) {
  return (
    <Field name={name} validators={validators} {...fieldProps}>
      {(field) => (
        <div className={cn('space-y-2', className)}>
          {label && (
            <label
              htmlFor={field.name}
              className={cn(
                'block text-sm font-medium',
                required && "after:content-['*'] after:ml-0.5 after:text-destructive",
                labelClassName
              )}
            >
              {label}
            </label>
          )}
          <textarea
            id={field.name}
            name={field.name}
            value={(field.state.value as string) || ''}
            onChange={(e) => field.handleChange(e.target.value as DeepValue<TFormData, TName>)}
            onBlur={field.handleBlur}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            rows={rows}
            aria-invalid={field.state.meta.errors.length > 0}
            aria-describedby={
              field.state.meta.errors.length > 0 ? `${field.name}-error` : undefined
            }
            className={cn(
              'w-full px-3 py-2 border rounded-md',
              'focus:outline-none focus:ring-2 focus:ring-primary',
              field.state.meta.errors.length > 0 && 'border-destructive',
              disabled && 'opacity-50 cursor-not-allowed',
              resize === 'none' && 'resize-none',
              resize === 'vertical' && 'resize-y',
              resize === 'horizontal' && 'resize-x',
              inputClassName
            )}
          />
          {showError && field.state.meta.errors.length > 0 && (
            <p
              id={`${field.name}-error`}
              className={cn('text-sm text-destructive', errorClassName)}
            >
              {field.state.meta.errors.join(', ')}
            </p>
          )}
        </div>
      )}
    </Field>
  );
}

// Select field
export interface SelectFieldProps<TFormData, TName extends DeepKeys<TFormData>>
  extends Omit<InputFieldProps<TFormData, TName>, 'type' | 'placeholder'> {
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function SelectField<TFormData, TName extends DeepKeys<TFormData>>({
  name,
  label,
  placeholder = 'Select an option',
  options,
  required,
  disabled,
  className,
  inputClassName,
  labelClassName,
  errorClassName,
  showError = true,
  validators,
  ...fieldProps
}: SelectFieldProps<TFormData, TName>) {
  return (
    <Field name={name} validators={validators} {...fieldProps}>
      {(field) => (
        <div className={cn('space-y-2', className)}>
          {label && (
            <label
              htmlFor={field.name}
              className={cn(
                'block text-sm font-medium',
                required && "after:content-['*'] after:ml-0.5 after:text-destructive",
                labelClassName
              )}
            >
              {label}
            </label>
          )}
          <select
            id={field.name}
            name={field.name}
            value={(field.state.value as string) || ''}
            onChange={(e) => field.handleChange(e.target.value as DeepValue<TFormData, TName>)}
            onBlur={field.handleBlur}
            required={required}
            disabled={disabled}
            aria-invalid={field.state.meta.errors.length > 0}
            aria-describedby={
              field.state.meta.errors.length > 0 ? `${field.name}-error` : undefined
            }
            className={cn(
              'w-full px-3 py-2 border rounded-md',
              'focus:outline-none focus:ring-2 focus:ring-primary',
              field.state.meta.errors.length > 0 && 'border-destructive',
              disabled && 'opacity-50 cursor-not-allowed',
              inputClassName
            )}
          >
            <option value="">{placeholder}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {showError && field.state.meta.errors.length > 0 && (
            <p
              id={`${field.name}-error`}
              className={cn('text-sm text-destructive', errorClassName)}
            >
              {field.state.meta.errors.join(', ')}
            </p>
          )}
        </div>
      )}
    </Field>
  );
}

// Checkbox field
export interface CheckboxFieldProps<TFormData, TName extends DeepKeys<TFormData>>
  extends Omit<InputFieldProps<TFormData, TName>, 'type' | 'placeholder'> {
  checkboxLabel?: string;
}

export function CheckboxField<TFormData, TName extends DeepKeys<TFormData>>({
  name,
  label,
  checkboxLabel,
  required,
  disabled,
  className,
  inputClassName,
  labelClassName,
  errorClassName,
  showError = true,
  validators,
  ...fieldProps
}: CheckboxFieldProps<TFormData, TName>) {
  return (
    <Field name={name} validators={validators} {...fieldProps}>
      {(field) => (
        <div className={cn('space-y-2', className)}>
          {label && (
            <label className={cn('block text-sm font-medium', labelClassName)}>
              {label}
              {required && <span className="ml-0.5 text-destructive">*</span>}
            </label>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              id={field.name}
              name={field.name}
              checked={(field.state.value as boolean) || false}
              onChange={(e) => field.handleChange(e.target.checked as DeepValue<TFormData, TName>)}
              onBlur={field.handleBlur}
              disabled={disabled}
              aria-invalid={field.state.meta.errors.length > 0}
              aria-describedby={
                field.state.meta.errors.length > 0 ? `${field.name}-error` : undefined
              }
              className={cn(
                'rounded border-gray-300',
                'focus:ring-2 focus:ring-primary',
                field.state.meta.errors.length > 0 && 'border-destructive',
                disabled && 'opacity-50 cursor-not-allowed',
                inputClassName
              )}
            />
            {checkboxLabel && <span className="text-sm">{checkboxLabel}</span>}
          </label>
          {showError && field.state.meta.errors.length > 0 && (
            <p
              id={`${field.name}-error`}
              className={cn('text-sm text-destructive', errorClassName)}
            >
              {field.state.meta.errors.join(', ')}
            </p>
          )}
        </div>
      )}
    </Field>
  );
}

// Form debugger
function FormDebugger<TFormData>({ form }: { form: FormApi<TFormData, any> }) {
  return (
    <div className="mt-4 p-4 bg-gray-100 rounded-md">
      <h4 className="font-semibold mb-2">Form Debug Info</h4>
      <pre className="text-xs overflow-auto">
        {JSON.stringify(
          {
            values: form.state.values,
            errors: form.state.errors,
            isSubmitting: form.state.isSubmitting,
            isValid: form.state.isValid,
            isDirty: form.state.isDirty,
            isTouched: form.state.isTouched,
          },
          null,
          2
        )}
      </pre>
    </div>
  );
}

// Submit button with loading state
export interface SubmitButtonProps {
  form: FormApi<any, any>;
  children?: React.ReactNode;
  loadingText?: string;
  className?: string;
  disabled?: boolean;
}

export function SubmitButton({
  form,
  children = 'Submit',
  loadingText = 'Submitting...',
  className,
  disabled,
}: SubmitButtonProps) {
  const isDisabled = disabled || form.state.isSubmitting || !form.state.isValid;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className={cn(
        'px-4 py-2 bg-primary text-primary-foreground rounded-md',
        'hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {form.state.isSubmitting ? loadingText : children}
    </button>
  );
}
