/**
 * Advanced Schema Validation
 * Comprehensive validation with multiple strategies
 */

export type SchemaType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' | 'any';

export interface ValidationRule {
  type?: SchemaType | SchemaType[];
  required?: boolean;
  nullable?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp | string;
  enum?: any[];
  custom?: (value: any, context?: any) => boolean | string;
  transform?: (value: any) => any;
  properties?: Record<string, ValidationRule>;
  items?: ValidationRule;
  additionalProperties?: boolean | ValidationRule;
  oneOf?: ValidationRule[];
  anyOf?: ValidationRule[];
  allOf?: ValidationRule[];
  not?: ValidationRule;
  if?: ValidationRule;
  then?: ValidationRule;
  else?: ValidationRule;
  default?: any;
  messages?: Record<string, string>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  value?: any;
}

export interface ValidationError {
  path: string;
  message: string;
  rule: string;
  value: any;
}

export interface ValidationWarning {
  path: string;
  message: string;
  suggestion?: string;
}

export interface ValidatorOptions {
  strict?: boolean;
  coerce?: boolean;
  removeAdditional?: boolean;
  useDefaults?: boolean;
  abortEarly?: boolean;
  context?: any;
}

/**
 * Schema Validator
 */
export class SchemaValidator {
  private schemas: Map<string, ValidationRule> = new Map();
  private customTypes: Map<string, ValidationRule> = new Map();
  private customFormats: Map<string, (value: any) => boolean> = new Map();

  constructor() {
    this.registerBuiltInFormats();
  }

  /**
   * Validate value against schema
   */
  validate(
    value: any,
    schema: ValidationRule | string,
    options: ValidatorOptions = {}
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Resolve schema if string reference
    const resolvedSchema = typeof schema === 'string' 
      ? this.schemas.get(schema) || this.customTypes.get(schema)
      : schema;
    
    if (!resolvedSchema) {
      return {
        valid: false,
        errors: [{
          path: '',
          message: `Schema "${schema}" not found`,
          rule: 'schema',
          value
        }],
        warnings: []
      };
    }

    const validatedValue = this.validateValue(
      value,
      resolvedSchema,
      '',
      errors,
      warnings,
      options
    );

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      value: validatedValue
    };
  }

  /**
   * Register schema
   */
  registerSchema(name: string, schema: ValidationRule): void {
    this.schemas.set(name, schema);
  }

  /**
   * Register custom type
   */
  registerType(name: string, definition: ValidationRule): void {
    this.customTypes.set(name, definition);
  }

  /**
   * Register custom format
   */
  registerFormat(name: string, validator: (value: any) => boolean): void {
    this.customFormats.set(name, validator);
  }

  /**
   * Create schema builder
   */
  schema(): SchemaBuilder {
    return new SchemaBuilder(this);
  }

  // Private validation methods

  private validateValue(
    value: any,
    rule: ValidationRule,
    path: string,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    options: ValidatorOptions
  ): any {
    // Apply defaults
    if (value === undefined && rule.default !== undefined && options.useDefaults) {
      value = typeof rule.default === 'function' ? rule.default() : rule.default;
    }

    // Apply transformation
    if (rule.transform) {
      value = rule.transform(value);
    }

    // Check required
    if (rule.required && (value === undefined || value === null)) {
      errors.push({
        path,
        message: rule.messages?.required || `Value is required`,
        rule: 'required',
        value
      });
      if (options.abortEarly) return value;
    }

    // Check nullable
    if (value === null) {
      if (!rule.nullable) {
        errors.push({
          path,
          message: rule.messages?.nullable || `Value cannot be null`,
          rule: 'nullable',
          value
        });
      }
      return value;
    }

    // Skip if undefined and not required
    if (value === undefined && !rule.required) {
      return value;
    }

    // Type validation
    if (rule.type) {
      const types = Array.isArray(rule.type) ? rule.type : [rule.type];
      const validType = types.some(type => this.checkType(value, type));
      
      if (!validType) {
        if (options.coerce) {
          value = this.coerceType(value, types[0]);
        } else {
          errors.push({
            path,
            message: rule.messages?.type || `Expected type ${types.join(' or ')}, got ${typeof value}`,
            rule: 'type',
            value
          });
          if (options.abortEarly) return value;
        }
      }
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push({
        path,
        message: rule.messages?.enum || `Value must be one of: ${rule.enum.join(', ')}`,
        rule: 'enum',
        value
      });
      if (options.abortEarly) return value;
    }

    // String validation
    if (typeof value === 'string') {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        errors.push({
          path,
          message: rule.messages?.minLength || `String must be at least ${rule.minLength} characters`,
          rule: 'minLength',
          value
        });
      }
      
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        errors.push({
          path,
          message: rule.messages?.maxLength || `String must be at most ${rule.maxLength} characters`,
          rule: 'maxLength',
          value
        });
      }
      
      if (rule.pattern) {
        const regex = typeof rule.pattern === 'string' ? new RegExp(rule.pattern) : rule.pattern;
        if (!regex.test(value)) {
          errors.push({
            path,
            message: rule.messages?.pattern || `String does not match pattern`,
            rule: 'pattern',
            value
          });
        }
      }
    }

    // Number validation
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push({
          path,
          message: rule.messages?.min || `Value must be at least ${rule.min}`,
          rule: 'min',
          value
        });
      }
      
      if (rule.max !== undefined && value > rule.max) {
        errors.push({
          path,
          message: rule.messages?.max || `Value must be at most ${rule.max}`,
          rule: 'max',
          value
        });
      }
    }

    // Array validation
    if (Array.isArray(value)) {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        errors.push({
          path,
          message: rule.messages?.minItems || `Array must have at least ${rule.minLength} items`,
          rule: 'minItems',
          value
        });
      }
      
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        errors.push({
          path,
          message: rule.messages?.maxItems || `Array must have at most ${rule.maxLength} items`,
          rule: 'maxItems',
          value
        });
      }
      
      if (rule.items) {
        value = value.map((item, index) => 
          this.validateValue(
            item,
            rule.items!,
            `${path}[${index}]`,
            errors,
            warnings,
            options
          )
        );
      }
    }

    // Object validation
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if (rule.properties) {
        const validated: any = {};
        
        // Validate defined properties
        for (const [key, propRule] of Object.entries(rule.properties)) {
          validated[key] = this.validateValue(
            value[key],
            propRule,
            path ? `${path}.${key}` : key,
            errors,
            warnings,
            options
          );
        }
        
        // Handle additional properties
        for (const key of Object.keys(value)) {
          if (!(key in rule.properties)) {
            if (rule.additionalProperties === false) {
              if (options.removeAdditional) {
                // Skip this property
                continue;
              } else {
                errors.push({
                  path: path ? `${path}.${key}` : key,
                  message: `Additional property "${key}" is not allowed`,
                  rule: 'additionalProperties',
                  value: value[key]
                });
              }
            } else if (typeof rule.additionalProperties === 'object') {
              validated[key] = this.validateValue(
                value[key],
                rule.additionalProperties,
                path ? `${path}.${key}` : key,
                errors,
                warnings,
                options
              );
            } else {
              validated[key] = value[key];
            }
          }
        }
        
        value = validated;
      }
    }

    // Custom validation
    if (rule.custom) {
      const result = rule.custom(value, options.context);
      if (result !== true) {
        errors.push({
          path,
          message: typeof result === 'string' ? result : 'Custom validation failed',
          rule: 'custom',
          value
        });
      }
    }

    // Logical operators
    if (rule.oneOf) {
      const validSchemas = rule.oneOf.filter(schema => {
        const result = this.validate(value, schema, { ...options, abortEarly: true });
        return result.valid;
      });
      
      if (validSchemas.length !== 1) {
        errors.push({
          path,
          message: `Value must match exactly one schema (matched ${validSchemas.length})`,
          rule: 'oneOf',
          value
        });
      }
    }

    if (rule.anyOf) {
      const validSchemas = rule.anyOf.filter(schema => {
        const result = this.validate(value, schema, { ...options, abortEarly: true });
        return result.valid;
      });
      
      if (validSchemas.length === 0) {
        errors.push({
          path,
          message: 'Value must match at least one schema',
          rule: 'anyOf',
          value
        });
      }
    }

    if (rule.allOf) {
      for (const schema of rule.allOf) {
        const result = this.validate(value, schema, options);
        if (!result.valid) {
          errors.push(...result.errors);
        }
      }
    }

    if (rule.not) {
      const result = this.validate(value, rule.not, { ...options, abortEarly: true });
      if (result.valid) {
        errors.push({
          path,
          message: 'Value must not match the schema',
          rule: 'not',
          value
        });
      }
    }

    return value;
  }

  private checkType(value: any, type: SchemaType): boolean {
    switch (type) {
      case 'string': return typeof value === 'string';
      case 'number': return typeof value === 'number' && !isNaN(value);
      case 'boolean': return typeof value === 'boolean';
      case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array': return Array.isArray(value);
      case 'null': return value === null;
      case 'any': return true;
      default: return false;
    }
  }

  private coerceType(value: any, type: SchemaType): any {
    switch (type) {
      case 'string': return String(value);
      case 'number': return Number(value);
      case 'boolean': return Boolean(value);
      default: return value;
    }
  }

  private registerBuiltInFormats(): void {
    this.registerFormat('email', (value) => 
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    );
    
    this.registerFormat('url', (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    });
    
    this.registerFormat('uuid', (value) => 
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    );
    
    this.registerFormat('date', (value) => 
      !isNaN(Date.parse(value))
    );
    
    this.registerFormat('ipv4', (value) => 
      /^(\d{1,3}\.){3}\d{1,3}$/.test(value)
    );
    
    this.registerFormat('ipv6', (value) => 
      /^([0-9a-f]{0,4}:){7}[0-9a-f]{0,4}$/i.test(value)
    );
  }
}

/**
 * Schema Builder for fluent API
 */
export class SchemaBuilder {
  private rule: ValidationRule = {};
  private validator: SchemaValidator;

  constructor(validator: SchemaValidator) {
    this.validator = validator;
  }

  string(): this {
    this.rule.type = 'string';
    return this;
  }

  number(): this {
    this.rule.type = 'number';
    return this;
  }

  boolean(): this {
    this.rule.type = 'boolean';
    return this;
  }

  object(properties?: Record<string, ValidationRule>): this {
    this.rule.type = 'object';
    if (properties) {
      this.rule.properties = properties;
    }
    return this;
  }

  array(items?: ValidationRule): this {
    this.rule.type = 'array';
    if (items) {
      this.rule.items = items;
    }
    return this;
  }

  required(): this {
    this.rule.required = true;
    return this;
  }

  optional(): this {
    this.rule.required = false;
    return this;
  }

  nullable(): this {
    this.rule.nullable = true;
    return this;
  }

  min(value: number): this {
    this.rule.min = value;
    return this;
  }

  max(value: number): this {
    this.rule.max = value;
    return this;
  }

  minLength(value: number): this {
    this.rule.minLength = value;
    return this;
  }

  maxLength(value: number): this {
    this.rule.maxLength = value;
    return this;
  }

  pattern(regex: RegExp | string): this {
    this.rule.pattern = regex;
    return this;
  }

  enum(values: any[]): this {
    this.rule.enum = values;
    return this;
  }

  custom(validator: (value: any, context?: any) => boolean | string): this {
    this.rule.custom = validator;
    return this;
  }

  transform(transformer: (value: any) => any): this {
    this.rule.transform = transformer;
    return this;
  }

  default(value: any): this {
    this.rule.default = value;
    return this;
  }

  messages(messages: Record<string, string>): this {
    this.rule.messages = messages;
    return this;
  }

  build(): ValidationRule {
    return this.rule;
  }

  validate(value: any, options?: ValidatorOptions): ValidationResult {
    return this.validator.validate(value, this.rule, options);
  }
}

// Export singleton instance
export const validator = new SchemaValidator();