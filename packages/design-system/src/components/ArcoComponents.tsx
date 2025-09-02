/**
 * ArcoComponents - Enhanced Arco Design Components
 *
 * Provides enhanced Arco Design components with Katalyst-specific
 * features, animations, and design system integration
 */

import {
  Button as ArcoButton,
  Card as ArcoCard,
  Drawer as ArcoDrawer,
  Form as ArcoForm,
  Input as ArcoInput,
  Modal as ArcoModal,
  Select as ArcoSelect,
  Table as ArcoTable,
  Divider,
  Space,
  Typography,
} from '@arco-design/web-react';
import type {
  ButtonProps as ArcoButtonProps,
  CardProps as ArcoCardProps,
  DrawerProps as ArcoDrawerProps,
  FormProps as ArcoFormProps,
  InputProps as ArcoInputProps,
  ModalProps as ArcoModalProps,
  SelectProps as ArcoSelectProps,
  TableProps as ArcoTableProps,
} from '@arco-design/web-react';
import { AnimatePresence, motion } from 'framer-motion';
import type React from 'react';
import { forwardRef, useMemo } from 'react';
import { cn } from '../../utils';
import { useArcoContext } from './ArcoProvider';

const { Title, Paragraph, Text } = Typography;

// Enhanced Button Component
export interface KatalystButtonProps extends ArcoButtonProps {
  animation?: 'none' | 'scale' | 'bounce' | 'pulse' | 'rotate';
  gradient?: boolean;
  glow?: boolean;
  loading?: boolean;
  iconPosition?: 'start' | 'end';
}

export const Button = forwardRef<HTMLButtonElement, KatalystButtonProps>(
  ({ animation = 'scale', gradient = false, glow = false, className, children, ...props }, ref) => {
    const { currentTheme } = useArcoContext();

    const buttonVariants = {
      none: {},
      scale: {
        whileHover: { scale: 1.02 },
        whileTap: { scale: 0.98 },
      },
      bounce: {
        whileHover: { y: -2 },
        whileTap: { y: 0 },
      },
      pulse: {
        whileHover: { scale: [1, 1.05, 1] },
        transition: { duration: 0.3, repeat: Number.POSITIVE_INFINITY },
      },
      rotate: {
        whileHover: { rotate: 1 },
        whileTap: { rotate: 0 },
      },
    };

    const enhancedClassName = cn(
      'katalyst-button',
      {
        'bg-gradient-to-r from-primary-500 to-primary-600': gradient,
        'shadow-lg shadow-primary-500/25': glow,
        'transition-all duration-200': animation !== 'none',
      },
      className
    );

    return (
      <motion.div {...buttonVariants[animation]} className="inline-block">
        <ArcoButton ref={ref} className={enhancedClassName} {...props}>
          {children}
        </ArcoButton>
      </motion.div>
    );
  }
);

Button.displayName = 'KatalystButton';

// Enhanced Input Component
export interface KatalystInputProps extends ArcoInputProps {
  variant?: 'default' | 'filled' | 'borderless' | 'underlined';
  animateLabel?: boolean;
  showCharCount?: boolean;
}

export const Input = forwardRef<HTMLInputElement, KatalystInputProps>(
  (
    {
      variant = 'default',
      animateLabel = false,
      showCharCount = false,
      className,
      placeholder,
      maxLength,
      ...props
    },
    ref
  ) => {
    const enhancedClassName = cn(
      'katalyst-input',
      {
        'border-0 bg-gray-100': variant === 'filled',
        'border-0 border-b-2 rounded-none': variant === 'underlined',
        'border-0': variant === 'borderless',
      },
      className
    );

    const inputComponent = (
      <ArcoInput
        ref={ref}
        className={enhancedClassName}
        placeholder={placeholder}
        maxLength={maxLength}
        {...props}
      />
    );

    if (showCharCount && maxLength) {
      return (
        <div className="relative">
          {inputComponent}
          <div className="absolute right-2 bottom-1 text-xs text-gray-400">
            {props.value?.toString().length || 0}/{maxLength}
          </div>
        </div>
      );
    }

    return inputComponent;
  }
);

Input.displayName = 'KatalystInput';

// Enhanced Select Component
export interface KatalystSelectProps extends ArcoSelectProps {
  variant?: 'default' | 'filled' | 'borderless';
  searchPlaceholder?: string;
  emptyContent?: React.ReactNode;
}

export const Select = forwardRef<any, KatalystSelectProps>(
  (
    { variant = 'default', searchPlaceholder = 'Search...', emptyContent, className, ...props },
    ref
  ) => {
    const enhancedClassName = cn(
      'katalyst-select',
      {
        'border-0 bg-gray-100': variant === 'filled',
        'border-0': variant === 'borderless',
      },
      className
    );

    return (
      <ArcoSelect
        ref={ref}
        className={enhancedClassName}
        filterOption={(inputValue, option) =>
          option?.children?.toString().toLowerCase().includes(inputValue.toLowerCase()) || false
        }
        notFoundContent={
          emptyContent || <div className="text-center py-4 text-gray-500">No data</div>
        }
        {...props}
      />
    );
  }
);

Select.displayName = 'KatalystSelect';

// Enhanced Card Component
export interface KatalystCardProps extends ArcoCardProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  animation?: 'none' | 'hover' | 'float';
  gradient?: boolean;
}

export const Card = forwardRef<HTMLDivElement, KatalystCardProps>(
  (
    { variant = 'default', animation = 'hover', gradient = false, className, children, ...props },
    ref
  ) => {
    const cardVariants = {
      none: {},
      hover: {
        whileHover: { y: -4, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' },
      },
      float: {
        animate: { y: [-2, 2, -2] },
        transition: { duration: 3, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' },
      },
    };

    const enhancedClassName = cn(
      'katalyst-card',
      {
        'shadow-2xl': variant === 'elevated',
        'border-2': variant === 'outlined',
        'bg-gray-50': variant === 'filled',
        'bg-gradient-to-br from-white to-gray-50': gradient,
      },
      className
    );

    return (
      <motion.div {...cardVariants[animation]} className="inline-block w-full">
        <ArcoCard ref={ref} className={enhancedClassName} {...props}>
          {children}
        </ArcoCard>
      </motion.div>
    );
  }
);

Card.displayName = 'KatalystCard';

// Enhanced Table Component
export interface KatalystTableProps extends ArcoTableProps {
  variant?: 'default' | 'card' | 'borderless';
  showRowNumber?: boolean;
  stickyHeader?: boolean;
}

export const Table = forwardRef<any, KatalystTableProps>(
  (
    {
      variant = 'default',
      showRowNumber = false,
      stickyHeader = false,
      className,
      columns = [],
      ...props
    },
    ref
  ) => {
    const enhancedColumns = useMemo(() => {
      const cols = [...columns];

      if (showRowNumber) {
        cols.unshift({
          title: '#',
          dataIndex: '__rowNumber',
          width: 60,
          render: (_: any, __: any, index: number) => index + 1,
          fixed: 'left' as const,
        });
      }

      return cols;
    }, [columns, showRowNumber]);

    const enhancedClassName = cn(
      'katalyst-table',
      {
        'shadow-lg rounded-lg overflow-hidden': variant === 'card',
        'border-0': variant === 'borderless',
        '[&_.arco-table-thead>tr>th]:sticky [&_.arco-table-thead>tr>th]:top-0 [&_.arco-table-thead>tr>th]:z-10':
          stickyHeader,
      },
      className
    );

    return (
      <ArcoTable
        ref={ref}
        className={enhancedClassName}
        columns={enhancedColumns}
        scroll={stickyHeader ? { y: 400 } : undefined}
        {...props}
      />
    );
  }
);

Table.displayName = 'KatalystTable';

// Enhanced Form Component
export interface KatalystFormProps extends ArcoFormProps {
  variant?: 'default' | 'card' | 'inline' | 'floating';
  showRequiredMark?: boolean;
  autoSave?: boolean;
  onAutoSave?: (values: any) => void;
}

export const Form = forwardRef<any, KatalystFormProps>(
  (
    {
      variant = 'default',
      showRequiredMark = true,
      autoSave = false,
      onAutoSave,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const enhancedClassName = cn(
      'katalyst-form',
      {
        'p-6 bg-white rounded-lg shadow-lg': variant === 'card',
        'space-y-0': variant === 'inline',
        '[&_.arco-form-item-label]:floating': variant === 'floating',
      },
      className
    );

    return (
      <ArcoForm
        ref={ref}
        className={enhancedClassName}
        requiredSymbol={showRequiredMark}
        {...props}
      >
        {children}
      </ArcoForm>
    );
  }
);

Form.displayName = 'KatalystForm';
Form.Item = ArcoForm.Item;
Form.List = ArcoForm.List;
Form.Provider = ArcoForm.Provider;
Form.useForm = ArcoForm.useForm;
Form.useFormState = ArcoForm.useFormState;

// Enhanced Modal Component
export interface KatalystModalProps extends ArcoModalProps {
  animation?: 'fade' | 'scale' | 'slide' | 'zoom';
  variant?: 'default' | 'fullscreen' | 'drawer-like';
}

export const Modal = forwardRef<any, KatalystModalProps>(
  ({ animation = 'scale', variant = 'default', className, children, ...props }, ref) => {
    const modalVariants = {
      fade: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      },
      scale: {
        initial: { opacity: 0, scale: 0.8 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.8 },
      },
      slide: {
        initial: { opacity: 0, y: -50 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -50 },
      },
      zoom: {
        initial: { opacity: 0, scale: 0.3 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.3 },
      },
    };

    const enhancedClassName = cn(
      'katalyst-modal',
      {
        'w-screen h-screen max-w-none': variant === 'fullscreen',
        'w-96': variant === 'drawer-like',
      },
      className
    );

    return (
      <ArcoModal ref={ref} className={enhancedClassName} {...props}>
        <AnimatePresence mode="wait">
          {props.visible && (
            <motion.div {...modalVariants[animation]} transition={{ duration: 0.2 }}>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </ArcoModal>
    );
  }
);

Modal.displayName = 'KatalystModal';

// Enhanced Drawer Component
export interface KatalystDrawerProps extends ArcoDrawerProps {
  variant?: 'default' | 'overlay' | 'push';
  showHandle?: boolean;
}

export const Drawer = forwardRef<any, KatalystDrawerProps>(
  ({ variant = 'default', showHandle = false, className, children, ...props }, ref) => {
    const enhancedClassName = cn(
      'katalyst-drawer',
      {
        'bg-black/50': variant === 'overlay',
        'transform transition-transform': variant === 'push',
      },
      className
    );

    return (
      <ArcoDrawer ref={ref} className={enhancedClassName} {...props}>
        {showHandle && <div className="absolute top-4 right-4 w-8 h-1 bg-gray-300 rounded-full" />}
        {children}
      </ArcoDrawer>
    );
  }
);

Drawer.displayName = 'KatalystDrawer';

// Enhanced Typography Components
export const KatalystTypography = {
  Title: forwardRef<any, any>(({ gradient = false, className, ...props }, ref) => (
    <Title
      ref={ref}
      className={cn(
        {
          'bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent':
            gradient,
        },
        className
      )}
      {...props}
    />
  )),

  Paragraph: forwardRef<any, any>(({ className, ...props }, ref) => (
    <Paragraph ref={ref} className={cn('katalyst-paragraph', className)} {...props} />
  )),

  Text: forwardRef<any, any>(({ highlight = false, className, ...props }, ref) => (
    <Text
      ref={ref}
      className={cn(
        {
          'bg-yellow-200 px-1 rounded': highlight,
        },
        className
      )}
      {...props}
    />
  )),
};

// Export all components
export { Space, Divider };

// Default export with all enhanced components
export default {
  Button,
  Input,
  Select,
  Table,
  Form,
  Card,
  Modal,
  Drawer,
  Typography: KatalystTypography,
  Space,
  Divider,
};
