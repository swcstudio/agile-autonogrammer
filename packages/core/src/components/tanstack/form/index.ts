// Core form components
export {
  Form,
  Field,
  InputField,
  TextareaField,
  SelectField,
  CheckboxField,
  SubmitButton,
} from './Form';
export type {
  FormProps,
  FieldProps,
  InputFieldProps,
  TextareaFieldProps,
  SelectFieldProps,
  CheckboxFieldProps,
  SubmitButtonProps,
} from './Form';

// Field array components
export {
  FieldArray,
  DynamicList,
  RepeaterField,
} from './FieldArray';
export type {
  FieldArrayProps,
  DynamicListProps,
  RepeaterFieldProps,
} from './FieldArray';

// Validation utilities
export {
  validationSchemas,
  customValidators,
  asyncValidators,
  conditionalValidation,
  composeValidators,
  createFormSchema,
} from './validation';
export type { FieldConfig } from './validation';

// Hooks
export {
  useForm,
  useFieldState,
  useDependentField,
  useFormWizard,
  useFormAutoSave,
} from './hooks';
export type {
  UseFormOptions,
  FormStep,
} from './hooks';

// Re-export core types from @tanstack/react-form
export type {
  FormApi,
  FormOptions,
  FormState,
  FieldApi,
  FieldOptions,
  FieldState,
  DeepKeys,
  DeepValue,
  ValidationError,
  Validator,
} from '@tanstack/react-form';

// Export Zod for schema creation
export { z } from 'zod';
export { zodValidator } from '@tanstack/zod-form-adapter';

// Example form setup
import { z } from 'zod';

export const exampleFormSchema = z
  .object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    age: z
      .number()
      .min(18, 'Must be at least 18 years old')
      .max(100, 'Must be at most 100 years old'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((val) => val === true, 'You must accept the terms'),
    preferences: z
      .object({
        newsletter: z.boolean().optional(),
        notifications: z.enum(['all', 'important', 'none']).optional(),
      })
      .optional(),
    addresses: z
      .array(
        z.object({
          street: z.string().min(1, 'Street is required'),
          city: z.string().min(1, 'City is required'),
          state: z.string().min(2).max(2),
          zip: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
          type: z.enum(['home', 'work', 'other']),
        })
      )
      .min(1, 'At least one address is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ExampleFormData = z.infer<typeof exampleFormSchema>;

// Pre-configured form fields
export const formFieldPresets = {
  email: {
    type: 'email' as const,
    placeholder: 'you@example.com',
    validators: {
      onChange: customValidators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'),
    },
  },

  password: {
    type: 'password' as const,
    placeholder: '••••••••',
    validators: {
      onChange: customValidators.strongPassword(),
    },
  },

  phone: {
    type: 'tel' as const,
    placeholder: '(555) 123-4567',
    validators: {
      onChange: customValidators.pattern(
        /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{4,6}$/,
        'Invalid phone number'
      ),
    },
  },

  url: {
    type: 'url' as const,
    placeholder: 'https://example.com',
    validators: {
      onChange: customValidators.pattern(
        /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
        'Invalid URL'
      ),
    },
  },

  creditCard: {
    type: 'text' as const,
    placeholder: '1234 5678 9012 3456',
    validators: {
      onChange: composeValidators(
        customValidators.pattern(/^\d{13,19}$/, 'Invalid credit card number'),
        customValidators.creditCardLuhn()
      ),
    },
  },

  date: {
    type: 'text' as const,
    placeholder: 'YYYY-MM-DD',
    validators: {
      onChange: customValidators.pattern(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    },
  },
} as const;

// Import from other files
import { composeValidators, customValidators } from './validation';
