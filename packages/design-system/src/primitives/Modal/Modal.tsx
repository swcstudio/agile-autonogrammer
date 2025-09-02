/**
 * Modal Component - Enterprise-grade modal/dialog with Radix UI primitives
 * 
 * Features:
 * - Multiple sizes (xs, sm, default, lg, xl, full)
 * - Centered and top positioned
 * - Custom header and footer
 * - Scrollable content
 * - Nested modal support
 * - Confirmation dialogs
 * - Loading states
 * - Animation support
 * - Keyboard shortcuts (ESC to close)
 * - Focus trap
 * - ARIA compliant
 */

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Cross2Icon, InfoCircledIcon, ExclamationTriangleIcon, CheckCircledIcon } from '@radix-ui/react-icons';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import { Button } from '../Button/Button';

// ============================================================================
// Modal Variants
// ============================================================================

const modalVariants = cva(
  'fixed z-50 grid w-full gap-4 border bg-background p-6 shadow-lg duration-200',
  {
    variants: {
      size: {
        xs: 'max-w-xs',
        sm: 'max-w-sm',
        default: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-[95vw]',
      },
      position: {
        center: 'left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]',
        top: 'left-[50%] top-[10%] translate-x-[-50%]',
      },
    },
    defaultVariants: {
      size: 'default',
      position: 'center',
    },
  }
);

// ============================================================================
// Types
// ============================================================================

export interface ModalProps extends DialogPrimitive.DialogProps {
  size?: VariantProps<typeof modalVariants>['size'];
  position?: VariantProps<typeof modalVariants>['position'];
  title?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  closable?: boolean;
  closeIcon?: React.ReactNode;
  maskClosable?: boolean;
  keyboard?: boolean;
  destroyOnClose?: boolean;
  centered?: boolean;
  width?: string | number;
  zIndex?: number;
  className?: string;
  contentClassName?: string;
  overlayClassName?: string;
  loading?: boolean;
  confirmLoading?: boolean;
  okText?: string;
  cancelText?: string;
  okButtonProps?: React.ComponentProps<typeof Button>;
  cancelButtonProps?: React.ComponentProps<typeof Button>;
  onOk?: () => void | Promise<void>;
  onCancel?: () => void;
  afterClose?: () => void;
  trigger?: React.ReactNode;
}

// ============================================================================
// Modal Component
// ============================================================================

const Modal = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ModalProps
>(
  (
    {
      children,
      size,
      position,
      title,
      description,
      footer,
      closable = true,
      closeIcon,
      maskClosable = true,
      keyboard = true,
      destroyOnClose = false,
      centered,
      width,
      zIndex = 1000,
      className,
      contentClassName,
      overlayClassName,
      loading = false,
      confirmLoading = false,
      okText = 'OK',
      cancelText = 'Cancel',
      okButtonProps,
      cancelButtonProps,
      onOk,
      onCancel,
      afterClose,
      trigger,
      open,
      defaultOpen,
      onOpenChange,
      ...props
    },
    ref
  ) => {
    const [internalOpen, setInternalOpen] = React.useState(defaultOpen || false);
    const [isConfirmLoading, setIsConfirmLoading] = React.useState(false);
    
    const isControlled = open !== undefined;
    const isOpen = isControlled ? open : internalOpen;
    
    const handleOpenChange = (newOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(newOpen);
      }
      onOpenChange?.(newOpen);
      
      if (!newOpen) {
        afterClose?.();
      }
    };
    
    const handleOk = async () => {
      if (onOk) {
        setIsConfirmLoading(true);
        try {
          await onOk();
          handleOpenChange(false);
        } finally {
          setIsConfirmLoading(false);
        }
      } else {
        handleOpenChange(false);
      }
    };
    
    const handleCancel = () => {
      onCancel?.();
      handleOpenChange(false);
    };
    
    // Default footer
    const defaultFooter = (onOk || onCancel) && (
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isConfirmLoading || confirmLoading}
            {...cancelButtonProps}
          >
            {cancelText}
          </Button>
        )}
        {onOk && (
          <Button
            onClick={handleOk}
            loading={isConfirmLoading || confirmLoading}
            {...okButtonProps}
          >
            {okText}
          </Button>
        )}
      </div>
    );
    
    const actualPosition = centered ? 'center' : position;
    
    return (
      <DialogPrimitive.Root open={isOpen} onOpenChange={handleOpenChange} {...props}>
        {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}
        
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className={cn(
              'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              overlayClassName
            )}
            style={{ zIndex }}
            onClick={maskClosable ? () => handleOpenChange(false) : undefined}
          />
          
          <DialogPrimitive.Content
            ref={ref}
            className={cn(
              modalVariants({ size, position: actualPosition }),
              'rounded-lg',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
              actualPosition === 'center' && 'data-[state=closed]:slide-out-to-bottom-[48%]',
              actualPosition === 'center' && 'data-[state=open]:slide-in-from-bottom-[48%]',
              actualPosition === 'top' && 'data-[state=closed]:slide-out-to-top-[10%]',
              actualPosition === 'top' && 'data-[state=open]:slide-in-from-top-[10%]',
              className
            )}
            style={{ zIndex: zIndex + 1, width }}
            onEscapeKeyDown={keyboard ? undefined : (e) => e.preventDefault()}
            onPointerDownOutside={maskClosable ? undefined : (e) => e.preventDefault()}
            onInteractOutside={maskClosable ? undefined : (e) => e.preventDefault()}
          >
            {/* Header */}
            {(title || closable) && (
              <div className="flex items-start justify-between border-b pb-3">
                <div className="flex-1">
                  {title && (
                    <DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight">
                      {title}
                    </DialogPrimitive.Title>
                  )}
                  {description && (
                    <DialogPrimitive.Description className="text-sm text-muted-foreground mt-1">
                      {description}
                    </DialogPrimitive.Description>
                  )}
                </div>
                
                {closable && (
                  <DialogPrimitive.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                    {closeIcon || <Cross2Icon className="h-4 w-4" />}
                    <span className="sr-only">Close</span>
                  </DialogPrimitive.Close>
                )}
              </div>
            )}
            
            {/* Content */}
            <div className={cn('flex-1 overflow-y-auto', contentClassName)}>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                </div>
              ) : (
                children
              )}
            </div>
            
            {/* Footer */}
            {(footer !== undefined ? footer : defaultFooter) && (
              <div className="border-t pt-3">
                {footer !== undefined ? footer : defaultFooter}
              </div>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }
);

Modal.displayName = 'Modal';

// ============================================================================
// Alert Modal Component
// ============================================================================

export interface AlertModalProps extends Omit<ModalProps, 'children'> {
  type?: 'info' | 'success' | 'warning' | 'error';
  icon?: React.ReactNode;
  content?: React.ReactNode;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  type = 'info',
  icon,
  title = 'Alert',
  content,
  okText = 'OK',
  size = 'sm',
  ...props
}) => {
  const icons = {
    info: <InfoCircledIcon className="h-5 w-5 text-blue-500" />,
    success: <CheckCircledIcon className="h-5 w-5 text-green-500" />,
    warning: <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />,
    error: <Cross2Icon className="h-5 w-5 text-red-500" />,
  };
  
  const actualIcon = icon || icons[type];
  
  return (
    <Modal
      size={size}
      title={
        <div className="flex items-center gap-2">
          {actualIcon}
          <span>{title}</span>
        </div>
      }
      footer={
        <Button onClick={() => props.onOpenChange?.(false)}>
          {okText}
        </Button>
      }
      {...props}
    >
      {content}
    </Modal>
  );
};

// ============================================================================
// Confirm Modal Component
// ============================================================================

export interface ConfirmModalProps extends Omit<ModalProps, 'children'> {
  type?: 'info' | 'success' | 'warning' | 'error';
  icon?: React.ReactNode;
  content?: React.ReactNode;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  type = 'warning',
  icon,
  title = 'Confirm',
  content = 'Are you sure?',
  okText = 'Confirm',
  cancelText = 'Cancel',
  size = 'sm',
  ...props
}) => {
  const icons = {
    info: <InfoCircledIcon className="h-5 w-5 text-blue-500" />,
    success: <CheckCircledIcon className="h-5 w-5 text-green-500" />,
    warning: <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />,
    error: <Cross2Icon className="h-5 w-5 text-red-500" />,
  };
  
  const actualIcon = icon || icons[type];
  const okButtonVariant = type === 'error' ? 'destructive' : 'primary';
  
  return (
    <Modal
      size={size}
      title={
        <div className="flex items-center gap-2">
          {actualIcon}
          <span>{title}</span>
        </div>
      }
      okText={okText}
      cancelText={cancelText}
      okButtonProps={{ variant: okButtonVariant as any }}
      {...props}
    >
      {content}
    </Modal>
  );
};

// ============================================================================
// Modal Methods (Imperative API)
// ============================================================================

interface ModalMethod {
  destroy: () => void;
  update: (config: ModalProps) => void;
}

const createModal = (config: ModalProps): ModalMethod => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  
  let currentConfig = { ...config, open: true };
  
  const render = (props: ModalProps) => {
    // This would need ReactDOM.render or React 18's createRoot
    // Implementation depends on React version
  };
  
  const destroy = () => {
    currentConfig = { ...currentConfig, open: false };
    render(currentConfig);
    setTimeout(() => {
      document.body.removeChild(container);
    }, 300);
  };
  
  const update = (newConfig: ModalProps) => {
    currentConfig = { ...currentConfig, ...newConfig };
    render(currentConfig);
  };
  
  render(currentConfig);
  
  return { destroy, update };
};

export const modal = {
  info: (props: Omit<AlertModalProps, 'type'>) => 
    createModal({ ...props, children: <AlertModal {...props} type="info" /> }),
  
  success: (props: Omit<AlertModalProps, 'type'>) =>
    createModal({ ...props, children: <AlertModal {...props} type="success" /> }),
  
  warning: (props: Omit<AlertModalProps, 'type'>) =>
    createModal({ ...props, children: <AlertModal {...props} type="warning" /> }),
  
  error: (props: Omit<AlertModalProps, 'type'>) =>
    createModal({ ...props, children: <AlertModal {...props} type="error" /> }),
  
  confirm: (props: ConfirmModalProps) =>
    createModal({ ...props, children: <ConfirmModal {...props} /> }),
};

// ============================================================================
// Drawer Component (Side Modal)
// ============================================================================

export interface DrawerProps extends ModalProps {
  placement?: 'left' | 'right' | 'top' | 'bottom';
  width?: string | number;
  height?: string | number;
}

export const Drawer: React.FC<DrawerProps> = ({
  placement = 'right',
  width = placement === 'left' || placement === 'right' ? '320px' : '100%',
  height = placement === 'top' || placement === 'bottom' ? '320px' : '100%',
  className,
  contentClassName,
  ...props
}) => {
  const placementClasses = {
    left: 'fixed left-0 top-0 h-full',
    right: 'fixed right-0 top-0 h-full',
    top: 'fixed left-0 top-0 w-full',
    bottom: 'fixed left-0 bottom-0 w-full',
  };
  
  const animationClasses = {
    left: 'data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
    right: 'data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
    top: 'data-[state=open]:slide-in-from-top data-[state=closed]:slide-out-to-top',
    bottom: 'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
  };
  
  return (
    <Modal
      {...props}
      className={cn(
        placementClasses[placement],
        animationClasses[placement],
        'max-w-none rounded-none',
        className
      )}
      contentClassName={cn('h-full', contentClassName)}
      size={undefined as any}
      position={undefined as any}
      style={{
        width: placement === 'left' || placement === 'right' ? width : undefined,
        height: placement === 'top' || placement === 'bottom' ? height : undefined,
      }}
    />
  );
};

// ============================================================================
// Exports
// ============================================================================

export { Modal, modalVariants };
export default Modal;