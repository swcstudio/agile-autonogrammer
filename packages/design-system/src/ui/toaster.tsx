'use client';

import { cn } from '@/lib/utils';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { type VariantProps, cva } from 'class-variance-authority';
import { AlertCircle, AlertTriangle, Brain, CheckCircle, Globe, Info, X, Zap } from 'lucide-react';
import * as React from 'react';

const ToastProvider = ToastPrimitive.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      'fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]',
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg border p-4 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full',
  {
    variants: {
      variant: {
        default: 'border bg-background text-foreground',
        destructive:
          'destructive group border-destructive bg-destructive text-destructive-foreground',
        success:
          'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100',
        warning:
          'border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100',
        info: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100',
        // Web3/AI themed variants
        web3: 'border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-900 dark:border-blue-800 dark:from-blue-950/50 dark:to-purple-950/50 dark:text-blue-100',
        ai: 'border-teal-200 bg-gradient-to-r from-teal-50 to-green-50 text-teal-900 dark:border-teal-800 dark:from-teal-950/50 dark:to-green-950/50 dark:text-teal-100',
        enterprise:
          'border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitive.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
});
Toast.displayName = ToastPrimitive.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Action
    ref={ref}
    className={cn(
      'inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive',
      className
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitive.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    className={cn(
      'absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600',
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitive.Close>
));
ToastClose.displayName = ToastPrimitive.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title ref={ref} className={cn('text-sm font-semibold', className)} {...props} />
));
ToastTitle.displayName = ToastPrimitive.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description
    ref={ref}
    className={cn('text-sm opacity-90', className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitive.Description.displayName;

// Custom toast components with icons
interface ToastWithIconProps extends React.ComponentPropsWithoutRef<typeof Toast> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export const SuccessToast = React.forwardRef<React.ElementRef<typeof Toast>, ToastWithIconProps>(
  ({ title, description, action, children, ...props }, ref) => (
    <Toast ref={ref} variant="success" {...props}>
      <div className="flex items-start gap-3">
        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {title && <ToastTitle>{title}</ToastTitle>}
          {description && <ToastDescription>{description}</ToastDescription>}
          {children}
        </div>
      </div>
      {action}
      <ToastClose />
    </Toast>
  )
);
SuccessToast.displayName = 'SuccessToast';

export const ErrorToast = React.forwardRef<React.ElementRef<typeof Toast>, ToastWithIconProps>(
  ({ title, description, action, children, ...props }, ref) => (
    <Toast ref={ref} variant="destructive" {...props}>
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {title && <ToastTitle>{title}</ToastTitle>}
          {description && <ToastDescription>{description}</ToastDescription>}
          {children}
        </div>
      </div>
      {action}
      <ToastClose />
    </Toast>
  )
);
ErrorToast.displayName = 'ErrorToast';

export const WarningToast = React.forwardRef<React.ElementRef<typeof Toast>, ToastWithIconProps>(
  ({ title, description, action, children, ...props }, ref) => (
    <Toast ref={ref} variant="warning" {...props}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {title && <ToastTitle>{title}</ToastTitle>}
          {description && <ToastDescription>{description}</ToastDescription>}
          {children}
        </div>
      </div>
      {action}
      <ToastClose />
    </Toast>
  )
);
WarningToast.displayName = 'WarningToast';

export const InfoToast = React.forwardRef<React.ElementRef<typeof Toast>, ToastWithIconProps>(
  ({ title, description, action, children, ...props }, ref) => (
    <Toast ref={ref} variant="info" {...props}>
      <div className="flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {title && <ToastTitle>{title}</ToastTitle>}
          {description && <ToastDescription>{description}</ToastDescription>}
          {children}
        </div>
      </div>
      {action}
      <ToastClose />
    </Toast>
  )
);
InfoToast.displayName = 'InfoToast';

export const Web3Toast = React.forwardRef<React.ElementRef<typeof Toast>, ToastWithIconProps>(
  ({ title, description, action, children, ...props }, ref) => (
    <Toast ref={ref} variant="web3" {...props}>
      <div className="flex items-start gap-3">
        <Globe className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {title && <ToastTitle>{title}</ToastTitle>}
          {description && <ToastDescription>{description}</ToastDescription>}
          {children}
        </div>
      </div>
      {action}
      <ToastClose />
    </Toast>
  )
);
Web3Toast.displayName = 'Web3Toast';

export const AIToast = React.forwardRef<React.ElementRef<typeof Toast>, ToastWithIconProps>(
  ({ title, description, action, children, ...props }, ref) => (
    <Toast ref={ref} variant="ai" {...props}>
      <div className="flex items-start gap-3">
        <Brain className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {title && <ToastTitle>{title}</ToastTitle>}
          {description && <ToastDescription>{description}</ToastDescription>}
          {children}
        </div>
      </div>
      {action}
      <ToastClose />
    </Toast>
  )
);
AIToast.displayName = 'AIToast';

export const EnterpriseToast = React.forwardRef<React.ElementRef<typeof Toast>, ToastWithIconProps>(
  ({ title, description, action, children, ...props }, ref) => (
    <Toast ref={ref} variant="enterprise" {...props}>
      <div className="flex items-start gap-3">
        <Zap className="h-5 w-5 text-slate-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {title && <ToastTitle>{title}</ToastTitle>}
          {description && <ToastDescription>{description}</ToastDescription>}
          {children}
        </div>
      </div>
      {action}
      <ToastClose />
    </Toast>
  )
);
EnterpriseToast.displayName = 'EnterpriseToast';

// Main Toaster component
type ToasterProps = React.ComponentPropsWithoutRef<typeof ToastProvider>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <ToastProvider {...props}>
      <ToastViewport />
    </ToastProvider>
  );
};

export {
  type ToasterProps,
  Toaster,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
