import { ValidationError, Validator } from '@tanstack/react-form';
import { z } from 'zod';

// Common validation schemas
export const validationSchemas = {
  email: z.string().email('Invalid email address'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),

  phone: z
    .string()
    .regex(
      /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{4,6}$/,
      'Invalid phone number'
    ),

  url: z.string().url('Invalid URL'),

  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),

  postalCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid postal code'),

  creditCard: z.string().regex(/^\d{13,19}$/, 'Invalid credit card number'),

  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),

  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
};

// Custom validators
export const customValidators = {
  required: (message = 'This field is required') => {
    return (value: any) => {
      if (value === null || value === undefined || value === '') {
        return message;
      }
      return undefined;
    };
  },

  minLength: (min: number, message?: string) => {
    return (value: string) => {
      if (value && value.length < min) {
        return message || `Must be at least ${min} characters`;
      }
      return undefined;
    };
  },

  maxLength: (max: number, message?: string) => {
    return (value: string) => {
      if (value && value.length > max) {
        return message || `Must be at most ${max} characters`;
      }
      return undefined;
    };
  },

  min: (min: number, message?: string) => {
    return (value: number) => {
      if (value !== undefined && value < min) {
        return message || `Must be at least ${min}`;
      }
      return undefined;
    };
  },

  max: (max: number, message?: string) => {
    return (value: number) => {
      if (value !== undefined && value > max) {
        return message || `Must be at most ${max}`;
      }
      return undefined;
    };
  },

  pattern: (pattern: RegExp, message = 'Invalid format') => {
    return (value: string) => {
      if (value && !pattern.test(value)) {
        return message;
      }
      return undefined;
    };
  },

  matches: (fieldName: string, message = 'Fields must match') => {
    return (value: any, formData: any) => {
      if (value !== formData[fieldName]) {
        return message;
      }
      return undefined;
    };
  },

  unique: async (
    checkFn: (value: any) => Promise<boolean>,
    message = 'This value is already taken'
  ) => {
    return async (value: any) => {
      if (value) {
        const isUnique = await checkFn(value);
        if (!isUnique) {
          return message;
        }
      }
      return undefined;
    };
  },

  fileSize: (maxSize: number, message?: string) => {
    return (file: File) => {
      if (file && file.size > maxSize) {
        const sizeMB = (maxSize / 1024 / 1024).toFixed(2);
        return message || `File size must be less than ${sizeMB}MB`;
      }
      return undefined;
    };
  },

  fileType: (allowedTypes: string[], message?: string) => {
    return (file: File) => {
      if (file && !allowedTypes.includes(file.type)) {
        return message || `File type must be one of: ${allowedTypes.join(', ')}`;
      }
      return undefined;
    };
  },

  dateRange: (min?: Date, max?: Date) => {
    return (value: Date | string) => {
      const date = typeof value === 'string' ? new Date(value) : value;

      if (min && date < min) {
        return `Date must be after ${min.toLocaleDateString()}`;
      }

      if (max && date > max) {
        return `Date must be before ${max.toLocaleDateString()}`;
      }

      return undefined;
    };
  },

  creditCardLuhn: (message = 'Invalid credit card number') => {
    return (value: string) => {
      if (!value) return undefined;

      const digits = value.replace(/\D/g, '');
      let sum = 0;
      let isEven = false;

      for (let i = digits.length - 1; i >= 0; i--) {
        let digit = Number.parseInt(digits[i], 10);

        if (isEven) {
          digit *= 2;
          if (digit > 9) {
            digit -= 9;
          }
        }

        sum += digit;
        isEven = !isEven;
      }

      if (sum % 10 !== 0) {
        return message;
      }

      return undefined;
    };
  },

  strongPassword: (options?: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
  }) => {
    const {
      minLength = 8,
      requireUppercase = true,
      requireLowercase = true,
      requireNumbers = true,
      requireSpecialChars = true,
    } = options || {};

    return (value: string) => {
      const errors: string[] = [];

      if (!value) return undefined;

      if (value.length < minLength) {
        errors.push(`at least ${minLength} characters`);
      }

      if (requireUppercase && !/[A-Z]/.test(value)) {
        errors.push('one uppercase letter');
      }

      if (requireLowercase && !/[a-z]/.test(value)) {
        errors.push('one lowercase letter');
      }

      if (requireNumbers && !/[0-9]/.test(value)) {
        errors.push('one number');
      }

      if (requireSpecialChars && !/[^A-Za-z0-9]/.test(value)) {
        errors.push('one special character');
      }

      if (errors.length > 0) {
        return `Password must contain ${errors.join(', ')}`;
      }

      return undefined;
    };
  },
};

// Async validation helpers
export const asyncValidators = {
  checkEmailAvailable: (apiEndpoint: string) => {
    return async (email: string) => {
      if (!email) return undefined;

      try {
        const response = await fetch(`${apiEndpoint}?email=${encodeURIComponent(email)}`);
        const data = await response.json();

        if (data.exists) {
          return 'This email is already registered';
        }
      } catch (error) {
        console.error('Email validation error:', error);
      }

      return undefined;
    };
  },

  checkUsernameAvailable: (apiEndpoint: string) => {
    return async (username: string) => {
      if (!username) return undefined;

      try {
        const response = await fetch(`${apiEndpoint}?username=${encodeURIComponent(username)}`);
        const data = await response.json();

        if (data.exists) {
          return 'This username is already taken';
        }
      } catch (error) {
        console.error('Username validation error:', error);
      }

      return undefined;
    };
  },

  validateAddress: (apiEndpoint: string) => {
    return async (address: string) => {
      if (!address) return undefined;

      try {
        const response = await fetch(`${apiEndpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        });
        const data = await response.json();

        if (!data.valid) {
          return data.message || 'Invalid address';
        }
      } catch (error) {
        console.error('Address validation error:', error);
      }

      return undefined;
    };
  },
};

// Conditional validation
export function conditionalValidation<T>(
  condition: (formData: T) => boolean,
  validator: (value: any, formData: T) => string | undefined
) {
  return (value: any, formData: T) => {
    if (condition(formData)) {
      return validator(value, formData);
    }
    return undefined;
  };
}

// Compose multiple validators
export function composeValidators<T>(
  ...validators: Array<
    (value: any, formData?: T) => string | undefined | Promise<string | undefined>
  >
) {
  return async (value: any, formData?: T) => {
    for (const validator of validators) {
      const error = await validator(value, formData);
      if (error) {
        return error;
      }
    }
    return undefined;
  };
}

// Create form schema from field configs
export interface FieldConfig {
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => string | undefined;
}

export function createFormSchema<T extends Record<string, FieldConfig>>(
  fields: T
): z.ZodObject<{
  [K in keyof T]: z.ZodType<any>;
}> {
  const shape: any = {};

  for (const [key, config] of Object.entries(fields)) {
    let schema: any;

    switch (config.type) {
      case 'string':
        schema = z.string();
        if (config.minLength) schema = schema.min(config.minLength);
        if (config.maxLength) schema = schema.max(config.maxLength);
        if (config.pattern) schema = schema.regex(config.pattern);
        if (config.enum) schema = z.enum(config.enum as [string, ...string[]]);
        break;

      case 'number':
        schema = z.number();
        if (config.min !== undefined) schema = schema.min(config.min);
        if (config.max !== undefined) schema = schema.max(config.max);
        break;

      case 'boolean':
        schema = z.boolean();
        break;

      case 'date':
        schema = z.date();
        break;

      case 'array':
        schema = z.array(z.any());
        if (config.minLength) schema = schema.min(config.minLength);
        if (config.maxLength) schema = schema.max(config.maxLength);
        break;

      case 'object':
        schema = z.object({});
        break;

      default:
        schema = z.any();
    }

    if (!config.required) {
      schema = schema.optional();
    }

    if (config.custom) {
      schema = schema.refine(config.custom);
    }

    shape[key] = schema;
  }

  return z.object(shape);
}
