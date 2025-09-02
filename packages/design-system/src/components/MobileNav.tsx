import {
  AppstoreOutlined,
  BellOutlined,
  HomeOutlined,
  PlusOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Badge } from 'antd';
import { AnimatePresence, type PanInfo, motion } from 'framer-motion';
import type React from 'react';
import { useEffect, useState } from 'react';
import { cn } from '../../utils';
import { useDesignSystemStore } from '../design-system-store';

export interface MobileNavItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  badge?: number | string;
  onClick?: () => void;
}

export interface MobileNavProps {
  items?: MobileNavItem[];
  activeKey?: string;
  onChange?: (key: string) => void;
  position?: 'bottom' | 'top';
  variant?: 'default' | 'floating' | 'pill' | 'dock';
  showLabels?: boolean;
  enableHaptic?: boolean;
  floatingActionButton?: {
    icon?: React.ReactNode;
    onClick?: () => void;
  };
  className?: string;
}

const defaultItems: MobileNavItem[] = [
  { key: 'home', icon: <HomeOutlined />, label: 'Home' },
  { key: 'apps', icon: <AppstoreOutlined />, label: 'Apps' },
  { key: 'notifications', icon: <BellOutlined />, label: 'Alerts', badge: 3 },
  { key: 'profile', icon: <UserOutlined />, label: 'Profile' },
];

export const MobileNav: React.FC<MobileNavProps> = ({
  items = defaultItems,
  activeKey = 'home',
  onChange,
  position = 'bottom',
  variant = 'default',
  showLabels = true,
  enableHaptic = true,
  floatingActionButton,
  className,
}) => {
  const { hapticFeedback } = useDesignSystemStore();
  const [localActiveKey, setLocalActiveKey] = useState(activeKey);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Handle scroll to hide/show navigation
  useEffect(() => {
    if (variant !== 'floating') return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, variant]);

  const handleItemClick = (item: MobileNavItem) => {
    setLocalActiveKey(item.key);
    onChange?.(item.key);
    item.onClick?.();

    // Trigger haptic feedback if enabled
    if (enableHaptic && hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const navVariants = {
    default: cn(
      'bg-background border-t border-border',
      position === 'bottom' ? 'bottom-0' : 'top-0'
    ),
    floating: cn(
      'bg-background/95 backdrop-blur-lg shadow-lg',
      'mx-4 rounded-2xl border border-border',
      position === 'bottom' ? 'bottom-4' : 'top-4'
    ),
    pill: cn(
      'bg-background/95 backdrop-blur-lg shadow-lg',
      'mx-auto rounded-full border border-border',
      'max-w-fit px-2',
      position === 'bottom' ? 'bottom-4' : 'top-4'
    ),
    dock: cn(
      'bg-background/80 backdrop-blur-xl shadow-2xl',
      'mx-auto rounded-2xl border border-border/50',
      'max-w-fit px-3',
      position === 'bottom' ? 'bottom-4' : 'top-4'
    ),
  };

  const itemVariants = {
    inactive: { scale: 1, y: 0 },
    active: { scale: 1.1, y: variant === 'dock' ? -4 : 0 },
  };

  const renderNavItem = (item: MobileNavItem) => {
    const isActive = localActiveKey === item.key;

    return (
      <motion.button
        key={item.key}
        className={cn(
          'katalyst-mobile-nav-item',
          'relative flex flex-col items-center justify-center',
          'min-w-[64px] py-2 px-3',
          'transition-colors duration-200',
          'touch-manipulation select-none',
          {
            'text-primary': isActive,
            'text-muted hover:text-foreground': !isActive,
          }
        )}
        onClick={() => handleItemClick(item)}
        variants={itemVariants}
        animate={isActive ? 'active' : 'inactive'}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        {/* Icon with badge */}
        <div className="relative">
          {item.badge !== undefined && (
            <Badge count={item.badge} size="small" className="absolute -top-2 -right-2" />
          )}
          <div className={cn('text-2xl', variant === 'dock' && isActive && 'text-3xl')}>
            {item.icon}
          </div>
        </div>

        {/* Label */}
        {showLabels && (
          <motion.span
            className={cn(
              'text-xs mt-1',
              'whitespace-nowrap overflow-hidden',
              variant === 'pill' && 'hidden'
            )}
            initial={{ opacity: 0, height: 0 }}
            animate={{
              opacity: variant === 'dock' && !isActive ? 0 : 1,
              height: variant === 'dock' && !isActive ? 0 : 'auto',
            }}
            transition={{ duration: 0.2 }}
          >
            {item.label}
          </motion.span>
        )}

        {/* Active indicator */}
        {isActive && variant === 'default' && (
          <motion.div
            className="absolute bottom-0 left-1/2 w-12 h-1 bg-primary rounded-full"
            layoutId="activeIndicator"
            initial={{ x: '-50%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}
      </motion.button>
    );
  };

  const navContent = (
    <nav
      className={cn(
        'katalyst-mobile-nav',
        'flex items-center justify-around',
        'h-16 px-2',
        variant === 'dock' && 'h-20 py-2'
      )}
    >
      {items.map(renderNavItem)}
    </nav>
  );

  const fabContent = floatingActionButton && (
    <motion.button
      className={cn(
        'katalyst-mobile-fab',
        'fixed z-50',
        'w-14 h-14 rounded-full',
        'bg-primary text-primary-foreground',
        'shadow-lg flex items-center justify-center',
        'touch-manipulation',
        position === 'bottom' ? 'bottom-20 right-4' : 'top-20 right-4'
      )}
      whileTap={{ scale: 0.9 }}
      onClick={floatingActionButton.onClick}
    >
      {floatingActionButton.icon || <PlusOutlined className="text-xl" />}
    </motion.button>
  );

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className={cn(
              'katalyst-mobile-nav-container',
              'fixed left-0 right-0 z-40',
              navVariants[variant],
              className
            )}
            initial={{
              y: position === 'bottom' ? 100 : -100,
              opacity: variant === 'floating' ? 0 : 1,
            }}
            animate={{
              y: 0,
              opacity: 1,
            }}
            exit={{
              y: position === 'bottom' ? 100 : -100,
              opacity: variant === 'floating' ? 0 : 1,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {navContent}
          </motion.div>
        )}
      </AnimatePresence>

      {fabContent}

      {/* Safe area spacer for fixed bottom nav */}
      {variant === 'default' && position === 'bottom' && <div className="h-16" />}
    </>
  );
};

// Gesture-enabled navigation for advanced interactions
export const GestureMobileNav: React.FC<MobileNavProps> = (props) => {
  const [draggedY, setDraggedY] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDrag = (event: any, info: PanInfo) => {
    setDraggedY(info.offset.y);
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    if (Math.abs(info.velocity.y) > 500 || Math.abs(info.offset.y) > 100) {
      setIsExpanded(info.offset.y < 0);
    }
    setDraggedY(0);
  };

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-50"
      drag="y"
      dragConstraints={{ top: -200, bottom: 0 }}
      dragElastic={0.2}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      animate={{
        y: isExpanded ? -200 : draggedY,
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      {/* Drag handle */}
      <div className="flex justify-center py-2 bg-background">
        <div className="w-12 h-1 bg-border rounded-full" />
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 200 }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-background border-t border-border"
          >
            {/* Additional quick actions or content */}
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              {/* Add quick action buttons here */}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Regular navigation */}
      <MobileNav {...props} />
    </motion.div>
  );
};
