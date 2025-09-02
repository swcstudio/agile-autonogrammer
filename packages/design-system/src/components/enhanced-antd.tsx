"use client";
import React from "react";
import {
  Button as AntButton,
  Input as AntInput,
  Select as AntSelect,
  Form as AntForm,
  Card as AntCard,
  Table as AntTable,
  Modal as AntModal,
  notification,
  message,
  ConfigProvider,
} from "antd";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../utils";
import { useTheme, useAnimation, useForm as useKatalystForm } from "@katalyst/hooks";

// Enhanced Button with Aceternity animations
export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof AntButton> & {
    gradient?: boolean;
    glow?: boolean;
  }
>(({ className, gradient, glow, children, ...props }, ref) => {
  const { theme } = useTheme();
  const animation = useAnimation();

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      {...animation}
    >
      <AntButton
        ref={ref as any}
        className={cn(
          gradient && "bg-gradient-to-r from-indigo-500 to-purple-600 border-0 text-white",
          glow && "shadow-lg shadow-indigo-500/50",
          className
        )}
        {...props}
      >
        {children}
      </AntButton>
    </motion.div>
  );
});

// Enhanced Input with floating label
export const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<typeof AntInput> & {
    label?: string;
    floatingLabel?: boolean;
  }
>(({ className, label, floatingLabel, ...props }, ref) => {
  const [focused, setFocused] = React.useState(false);
  const [hasValue, setHasValue] = React.useState(false);

  return (
    <div className="relative">
      {floatingLabel && label && (
        <motion.label
          animate={{
            y: focused || hasValue ? -20 : 0,
            scale: focused || hasValue ? 0.85 : 1,
            x: focused || hasValue ? -10 : 0,
          }}
          className={cn(
            "absolute left-3 top-3 text-gray-500 pointer-events-none",
            "origin-left transition-all"
          )}
        >
          {label}
        </motion.label>
      )}
      <AntInput
        ref={ref as any}
        className={cn(floatingLabel && "pt-6", className)}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          setFocused(false);
          setHasValue(!!e.target.value);
        }}
        onChange={(e) => setHasValue(!!e.target.value)}
        {...props}
      />
    </div>
  );
});

// Enhanced Card with hover effects
export const Card = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof AntCard> & {
    hoverEffect?: boolean;
    glowOnHover?: boolean;
  }
>(({ className, hoverEffect = true, glowOnHover, children, ...props }, ref) => {
  return (
    <motion.div
      whileHover={hoverEffect ? { y: -5 } : {}}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <AntCard
        ref={ref as any}
        className={cn(
          hoverEffect && "transition-shadow hover:shadow-xl",
          glowOnHover && "hover:shadow-lg hover:shadow-indigo-500/20",
          className
        )}
        {...props}
      >
        {children}
      </AntCard>
    </motion.div>
  );
});

// Enhanced Modal with animations
export const Modal: React.FC<
  React.ComponentProps<typeof AntModal> & {
    animationType?: "slide" | "fade" | "zoom";
  }
> = ({ children, animationType = "zoom", ...props }) => {
  const animations = {
    slide: {
      initial: { y: 100, opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: 100, opacity: 0 },
    },
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    zoom: {
      initial: { scale: 0.8, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      exit: { scale: 0.8, opacity: 0 },
    },
  };

  return (
    <AnimatePresence>
      {props.open && (
        <motion.div
          {...animations[animationType]}
          transition={{ type: "spring", damping: 20 }}
        >
          <AntModal {...props}>{children}</AntModal>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Enhanced Form with Katalyst form hooks
export const Form: React.FC<
  React.ComponentProps<typeof AntForm> & {
    onSubmit?: (values: any) => void | Promise<void>;
  }
> = ({ children, onSubmit, ...props }) => {
  const katalystForm = useKatalystForm();

  const handleFinish = async (values: any) => {
    try {
      await onSubmit?.(values);
      message.success("Form submitted successfully!");
    } catch (error) {
      message.error("Form submission failed!");
    }
  };

  return (
    <AntForm onFinish={handleFinish} {...props}>
      {children}
    </AntForm>
  );
};

// Enhanced Table with animations
export const Table: React.FC<React.ComponentProps<typeof AntTable>> = ({
  className,
  ...props
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <AntTable
        className={cn("shadow-sm", className)}
        {...props}
      />
    </motion.div>
  );
};

// Enhanced notification with custom styling
export const showNotification = (
  type: "success" | "info" | "warning" | "error",
  message: string,
  description?: string
) => {
  const icons = {
    success: "✅",
    info: "ℹ️",
    warning: "⚠️",
    error: "❌",
  };

  notification[type]({
    message: (
      <div className="flex items-center gap-2">
        <span>{icons[type]}</span>
        <span>{message}</span>
      </div>
    ),
    description,
    placement: "topRight",
    className: "custom-notification",
  });
};

// Theme provider with Aceternity + Ant Design
export const KatalystThemeProvider: React.FC<{
  children: React.ReactNode;
  theme?: "light" | "dark";
}> = ({ children, theme = "light" }) => {
  const antTheme = {
    token: {
      colorPrimary: "#6366f1",
      borderRadius: 8,
      fontFamily: "Inter, system-ui, sans-serif",
    },
    algorithm: theme === "dark" ? undefined : undefined,
  };

  return (
    <ConfigProvider theme={antTheme}>
      <div className={theme === "dark" ? "dark" : ""}>
        {children}
      </div>
    </ConfigProvider>
  );
};