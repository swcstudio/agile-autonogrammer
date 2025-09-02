/**
 * Input Component - Enterprise-grade input field with Radix UI primitives
 * 
 * Features:
 * - Multiple variants and sizes
 * - Prefix/suffix support
 * - Addon support (before/after)
 * - Clear button
 * - Password visibility toggle
 * - Character count
 * - Loading state
 * - Error/success states
 * - Full accessibility support
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import { useToken } from '../../tokens';
import { 
  Cross2Icon, 
  EyeOpenIcon, 
  EyeNoneIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  ClockIcon
} from '@radix-ui/react-icons';
import * as Label from '@radix-ui/react-label';

// ============================================================================
// Input Variants
// ============================================================================

const inputVariants = cva(
  'flex w-full rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all',
  {
    variants: {
      variant: {
        default: 'border-gray-300 focus:border-primary',
        filled: 'bg-gray-50 border-transparent focus:bg-white focus:border-primary',
        borderless: 'border-transparent shadow-none focus:ring-0 focus:ring-offset-0',
        underline: 'border-0 border-b rounded-none focus:ring-0 focus:ring-offset-0 focus:border-b-2',
      },
      size: {
        xs: 'h-7 px-2 text-xs',
        sm: 'h-8 px-3 text-xs',
        default: 'h-10 px-3 py-2',
        lg: 'h-12 px-4 text-base',
        xl: 'h-14 px-5 text-lg',
      },
      status: {
        default: '',
        error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
        success: 'border-green-500 focus:border-green-500 focus:ring-green-500',
        warning: 'border-yellow-500 focus:border-yellow-500 focus:ring-yellow-500',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      status: 'default',
    },
  }
);

// ============================================================================
// Input Types
// ============================================================================

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  helper?: string;
  error?: string;
  success?: string;
  warning?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  addonBefore?: React.ReactNode;
  addonAfter?: React.ReactNode;
  allowClear?: boolean;
  showCount?: boolean | { formatter?: (info: { value: string; count: number; maxLength?: number }) => string };
  maxLength?: number;
  loading?: boolean;
  inputClassName?: string;
  wrapperClassName?: string;
  onClear?: () => void;
  onPressEnter?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

// ============================================================================
// Input Component
// ============================================================================

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      inputClassName,
      wrapperClassName,
      type = 'text',
      variant,
      size,
      status: statusProp,
      label,
      helper,
      error,
      success,
      warning,
      prefix,
      suffix,
      addonBefore,
      addonAfter,
      allowClear,
      showCount,
      maxLength,
      loading,
      disabled,
      value,
      defaultValue,
      onChange,
      onClear,
      onPressEnter,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue || '');
    const [showPassword, setShowPassword] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);
    
    const inputRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => inputRef.current!);
    
    const controlledValue = value !== undefined ? value : internalValue;
    const stringValue = String(controlledValue || '');
    
    // Determine status
    const status = error ? 'error' : success ? 'success' : warning ? 'warning' : statusProp;
    
    // Handle change
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (value === undefined) {
        setInternalValue(e.target.value);
      }
      onChange?.(e);
    };
    
    // Handle clear
    const handleClear = () => {
      if (value === undefined) {
        setInternalValue('');
      }
      onClear?.();
      inputRef.current?.focus();
      
      // Trigger onChange with empty value
      const event = new Event('input', { bubbles: true });
      Object.defineProperty(event, 'target', { 
        writable: false, 
        value: { value: '' } 
      });
      onChange?.(event as any);
    };
    
    // Handle key down
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        onPressEnter?.(e);
      }
      onKeyDown?.(e);
    };
    
    // Toggle password visibility
    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };
    
    // Calculate character count
    const characterCount = stringValue.length;
    const showCharacterCount = showCount && (maxLength || showCount !== true);
    
    // Format character count display
    const getCountDisplay = () => {
      if (!showCharacterCount) return null;
      
      if (typeof showCount === 'object' && showCount.formatter) {
        return showCount.formatter({ 
          value: stringValue, 
          count: characterCount, 
          maxLength 
        });
      }
      
      return maxLength ? `${characterCount}/${maxLength}` : characterCount;
    };
    
    // Determine if clear button should show
    const showClearButton = allowClear && stringValue && !disabled && !loading;
    
    // Input type handling for password
    const inputType = type === 'password' && showPassword ? 'text' : type;
    
    // Build className for wrapper
    const wrapperClasses = cn(
      'relative inline-flex items-center w-full',
      wrapperClassName
    );
    
    // Build className for input group
    const inputGroupClasses = cn(
      'relative flex items-center w-full',
      (addonBefore || addonAfter) && 'input-group',
      isFocused && 'is-focused'
    );
    
    // Render label if provided
    const labelElement = label && (
      <Label.Root className="block text-sm font-medium mb-1" htmlFor={props.id}>
        {label}
        {props.required && <span className="text-red-500 ml-1">*</span>}
      </Label.Root>
    );
    
    // Render helper/error text
    const helperElement = (error || success || warning || helper) && (
      <div className={cn(
        'mt-1 text-xs',
        error && 'text-red-500',
        success && 'text-green-500',
        warning && 'text-yellow-500',
        !error && !success && !warning && 'text-gray-500'
      )}>
        {error || success || warning || helper}
      </div>
    );
    
    // Render character count
    const countElement = showCharacterCount && (
      <div className={cn(
        'text-xs text-gray-500 mt-1',
        maxLength && characterCount > maxLength && 'text-red-500'
      )}>
        {getCountDisplay()}
      </div>
    );
    
    return (
      <div className={className}>
        {labelElement}
        
        <div className={wrapperClasses}>
          <div className={inputGroupClasses}>
            {/* Addon Before */}
            {addonBefore && (
              <div className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                {addonBefore}
              </div>
            )}
            
            {/* Input Container */}
            <div className="relative flex items-center flex-1">
              {/* Prefix */}
              {prefix && (
                <div className="absolute left-3 flex items-center pointer-events-none text-gray-400">
                  {prefix}
                </div>
              )}
              
              {/* Input Field */}
              <input
                ref={inputRef}
                type={inputType}
                className={cn(
                  inputVariants({ variant, size, status }),
                  prefix && 'pl-10',
                  (suffix || showClearButton || type === 'password') && 'pr-10',
                  addonBefore && 'rounded-l-none',
                  addonAfter && 'rounded-r-none',
                  inputClassName
                )}
                value={controlledValue}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                disabled={disabled || loading}
                maxLength={maxLength}
                {...props}
              />
              
              {/* Suffix / Clear / Password Toggle */}
              <div className="absolute right-3 flex items-center gap-1">
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900" />
                )}
                
                {showClearButton && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    <Cross2Icon className="h-4 w-4" />
                  </button>
                )}
                
                {type === 'password' && !disabled && !loading && (
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeNoneIcon className="h-4 w-4" />
                    ) : (
                      <EyeOpenIcon className="h-4 w-4" />
                    )}
                  </button>
                )}
                
                {suffix && !showClearButton && type !== 'password' && (
                  <div className="text-gray-400">
                    {suffix}
                  </div>
                )}
              </div>
            </div>
            
            {/* Addon After */}
            {addonAfter && (
              <div className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                {addonAfter}
              </div>
            )}
          </div>
        </div>
        
        {helperElement}
        {countElement}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ============================================================================
// Search Input Component
// ============================================================================

export interface SearchInputProps extends Omit<InputProps, 'prefix' | 'type'> {
  onSearch?: (value: string) => void;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onSearch, onPressEnter, ...props }, ref) => {
    const handlePressEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
      onSearch?.(e.currentTarget.value);
      onPressEnter?.(e);
    };
    
    return (
      <Input
        ref={ref}
        prefix={<MagnifyingGlassIcon className="h-4 w-4" />}
        onPressEnter={handlePressEnter}
        allowClear
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

// ============================================================================
// Password Input Component
// ============================================================================

export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(
  (props, ref) => {
    return <Input ref={ref} type="password" {...props} />;
  }
);

PasswordInput.displayName = 'PasswordInput';

// ============================================================================
// Textarea Component
// ============================================================================

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'prefix'>,
    Omit<InputProps, 'type' | 'prefix' | 'suffix'> {
  autoSize?: boolean | { minRows?: number; maxRows?: number };
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      variant,
      size,
      status: statusProp,
      label,
      helper,
      error,
      success,
      warning,
      showCount,
      maxLength,
      autoSize,
      rows = 3,
      ...props
    },
    ref
  ) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    React.useImperativeHandle(ref, () => textareaRef.current!);
    
    const [value, setValue] = React.useState(props.defaultValue || '');
    const stringValue = String(props.value !== undefined ? props.value : value);
    
    // Auto-resize logic
    React.useEffect(() => {
      if (autoSize && textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    }, [stringValue, autoSize]);
    
    // Determine status
    const status = error ? 'error' : success ? 'success' : warning ? 'warning' : statusProp;
    
    // Calculate character count
    const characterCount = stringValue.length;
    const showCharacterCount = showCount && (maxLength || showCount !== true);
    
    return (
      <div className={className}>
        {label && (
          <Label.Root className="block text-sm font-medium mb-1">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </Label.Root>
        )}
        
        <textarea
          ref={textareaRef}
          className={cn(
            inputVariants({ variant, size, status }),
            'min-h-[80px] resize-y',
            autoSize && 'resize-none'
          )}
          rows={typeof autoSize === 'object' ? autoSize.minRows : rows}
          maxLength={maxLength}
          onChange={(e) => {
            setValue(e.target.value);
            props.onChange?.(e);
          }}
          {...props}
        />
        
        {(error || success || warning || helper) && (
          <div className={cn(
            'mt-1 text-xs',
            error && 'text-red-500',
            success && 'text-green-500',
            warning && 'text-yellow-500',
            !error && !success && !warning && 'text-gray-500'
          )}>
            {error || success || warning || helper}
          </div>
        )}
        
        {showCharacterCount && (
          <div className={cn(
            'text-xs text-gray-500 mt-1',
            maxLength && characterCount > maxLength && 'text-red-500'
          )}>
            {maxLength ? `${characterCount}/${maxLength}` : characterCount}
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// ============================================================================
// Exports
// ============================================================================

export { Input, inputVariants };
export default Input;