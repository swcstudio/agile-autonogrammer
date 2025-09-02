import {
  BellOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  SearchOutlined,
  SettingOutlined,
  SunOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Badge, Button, Drawer, Dropdown, Grid, Layout, Menu, Space } from 'antd';
import type { MenuProps } from 'antd';
import { AnimatePresence, motion } from 'framer-motion';
import type React from 'react';
import { useEffect, useState } from 'react';
import { cn } from '../../utils';
import { useDesignSystemStore, useIsMobile, useIsTablet } from '../design-system-store';
import { AnimatedButton } from './AnimatedButton';

const { Header, Sider, Content, Footer } = Layout;
const { useBreakpoint } = Grid;

export interface ProLayoutProps {
  // Layout configuration
  title?: React.ReactNode;
  logo?: React.ReactNode;
  layout?: 'side' | 'top' | 'mix';
  fixedHeader?: boolean;
  fixedSider?: boolean;
  siderWidth?: number;
  collapsedWidth?: number;
  breakpoint?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

  // Menu configuration
  menuItems?: MenuProps['items'];
  selectedKeys?: string[];
  openKeys?: string[];
  onMenuClick?: MenuProps['onClick'];

  // Header configuration
  headerHeight?: number;
  headerExtra?: React.ReactNode;
  showSearch?: boolean;
  showNotifications?: boolean;
  showUser?: boolean;
  userName?: string;
  userAvatar?: string;
  notificationCount?: number;

  // Footer configuration
  footer?: React.ReactNode;
  footerHeight?: number;

  // Mobile configuration
  mobileBreakpoint?: number;
  showMobileMenu?: boolean;
  mobileMenuPlacement?: 'left' | 'right';

  // Content
  children: React.ReactNode;
  contentPadding?: boolean;

  // Callbacks
  onCollapse?: (collapsed: boolean) => void;
  onSearch?: (value: string) => void;
  onNotificationClick?: () => void;
  onUserMenuClick?: (key: string) => void;
  onThemeToggle?: () => void;

  // Style
  className?: string;
  contentClassName?: string;
  siderClassName?: string;
  headerClassName?: string;
}

export const ProLayout: React.FC<ProLayoutProps> = ({
  title = 'Katalyst',
  logo,
  layout = 'side',
  fixedHeader = true,
  fixedSider = true,
  siderWidth = 240,
  collapsedWidth = 80,
  breakpoint = 'lg',

  menuItems = [],
  selectedKeys = [],
  openKeys = [],
  onMenuClick,

  headerHeight = 64,
  headerExtra,
  showSearch = true,
  showNotifications = true,
  showUser = true,
  userName = 'User',
  userAvatar,
  notificationCount = 0,

  footer,
  footerHeight = 64,

  mobileBreakpoint = 768,
  showMobileMenu = true,
  mobileMenuPlacement = 'left',

  children,
  contentPadding = true,

  onCollapse,
  onSearch,
  onNotificationClick,
  onUserMenuClick,
  onThemeToggle,

  className,
  contentClassName,
  siderClassName,
  headerClassName,
}) => {
  const screens = useBreakpoint();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const { activeTheme, toggleTheme } = useDesignSystemStore();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);

  // Auto-collapse on mobile
  useEffect(() => {
    if (isMobile || isTablet) {
      setCollapsed(true);
    }
  }, [isMobile, isTablet]);

  const handleCollapse = (value: boolean) => {
    setCollapsed(value);
    onCollapse?.(value);
  };

  const handleThemeToggle = () => {
    toggleTheme();
    onThemeToggle?.();
  };

  // User menu items
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
    },
  ];

  // Header content
  const headerContent = (
    <Header
      className={cn(
        'katalyst-pro-layout-header',
        'flex items-center justify-between px-4',
        'shadow-sm border-b border-border',
        {
          'fixed top-0 left-0 right-0 z-50': fixedHeader,
          'bg-background/95 backdrop-blur': fixedHeader,
        },
        headerClassName
      )}
      style={{ height: headerHeight }}
    >
      <Space>
        {/* Mobile menu trigger */}
        {isMobile && showMobileMenu && (
          <Button
            type="text"
            icon={<MenuUnfoldOutlined />}
            onClick={() => setMobileMenuVisible(true)}
            className="md:hidden"
          />
        )}

        {/* Desktop collapse trigger */}
        {!isMobile && layout === 'side' && (
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => handleCollapse(!collapsed)}
            className="hidden md:inline-flex"
          />
        )}

        {/* Logo and title for top layout */}
        {layout === 'top' && (
          <Space>
            {logo}
            <span className="text-lg font-semibold">{title}</span>
          </Space>
        )}
      </Space>

      <Space size="middle">
        {/* Search */}
        {showSearch && !isMobile && (
          <AnimatedButton
            type="text"
            icon={<SearchOutlined />}
            onClick={() => setSearchVisible(true)}
            variant="scale"
            animation="scale"
          />
        )}

        {/* Notifications */}
        {showNotifications && (
          <Badge count={notificationCount} size="small">
            <AnimatedButton
              type="text"
              icon={<BellOutlined />}
              onClick={onNotificationClick}
              variant="scale"
              animation="scale"
            />
          </Badge>
        )}

        {/* Theme toggle */}
        <AnimatedButton
          type="text"
          icon={activeTheme === 'dark' ? <SunOutlined /> : <MoonOutlined />}
          onClick={handleThemeToggle}
          variant="rotate"
          animation="rotate"
        />

        {/* User menu */}
        {showUser && (
          <Dropdown
            menu={{
              items: userMenuItems,
              onClick: ({ key }) => onUserMenuClick?.(key),
            }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Space className="cursor-pointer">
              <Avatar src={userAvatar} icon={<UserOutlined />} />
              {!isMobile && <span>{userName}</span>}
            </Space>
          </Dropdown>
        )}

        {/* Extra content */}
        {headerExtra}
      </Space>
    </Header>
  );

  // Sidebar content
  const sidebarContent = (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      onCollapse={handleCollapse}
      width={siderWidth}
      collapsedWidth={isMobile ? 0 : collapsedWidth}
      breakpoint={breakpoint}
      className={cn(
        'katalyst-pro-layout-sider',
        {
          'fixed left-0 top-0 bottom-0 z-40': fixedSider,
          'shadow-lg': fixedSider,
        },
        siderClassName
      )}
      style={{
        paddingTop: fixedHeader && fixedSider ? headerHeight : 0,
      }}
    >
      {/* Logo area */}
      <div className="flex items-center justify-center h-16 px-4">
        {logo}
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="ml-3 text-lg font-semibold whitespace-nowrap overflow-hidden"
            >
              {title}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Menu */}
      <Menu
        mode="inline"
        selectedKeys={selectedKeys}
        openKeys={openKeys}
        items={menuItems}
        onClick={onMenuClick}
        className="border-r-0"
        style={{ height: '100%' }}
      />
    </Sider>
  );

  // Main content
  const mainContent = (
    <Content
      className={cn(
        'katalyst-pro-layout-content',
        'transition-all duration-300',
        {
          'p-4 md:p-6': contentPadding,
        },
        contentClassName
      )}
      style={{
        marginTop: fixedHeader ? headerHeight : 0,
        marginLeft:
          fixedSider && layout === 'side' && !isMobile
            ? collapsed
              ? collapsedWidth
              : siderWidth
            : 0,
        minHeight: `calc(100vh - ${fixedHeader ? headerHeight : 0}px - ${footer ? footerHeight : 0}px)`,
      }}
    >
      {children}
    </Content>
  );

  // Mobile menu drawer
  const mobileMenuDrawer = (
    <Drawer
      title={title}
      placement={mobileMenuPlacement}
      onClose={() => setMobileMenuVisible(false)}
      open={mobileMenuVisible}
      width={siderWidth}
      className="katalyst-pro-layout-mobile-drawer"
    >
      <Menu
        mode="inline"
        selectedKeys={selectedKeys}
        openKeys={openKeys}
        items={menuItems}
        onClick={(info) => {
          onMenuClick?.(info);
          setMobileMenuVisible(false);
        }}
      />
    </Drawer>
  );

  // Search modal
  const searchModal = (
    <AnimatePresence>
      {searchVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50"
          onClick={() => setSearchVisible(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              placeholder="Search..."
              className="w-full px-6 py-4 text-lg bg-background border rounded-lg shadow-2xl focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSearch?.(e.currentTarget.value);
                  setSearchVisible(false);
                } else if (e.key === 'Escape') {
                  setSearchVisible(false);
                }
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render based on layout type
  if (layout === 'top') {
    return (
      <Layout className={cn('katalyst-pro-layout min-h-screen', className)}>
        {headerContent}
        <Layout>{mainContent}</Layout>
        {footer && (
          <Footer style={{ height: footerHeight }} className="text-center">
            {footer}
          </Footer>
        )}
        {mobileMenuDrawer}
        {searchModal}
      </Layout>
    );
  }

  return (
    <Layout className={cn('katalyst-pro-layout min-h-screen', className)}>
      {layout === 'side' && !isMobile && sidebarContent}
      <Layout>
        {headerContent}
        {mainContent}
        {footer && (
          <Footer
            style={{
              height: footerHeight,
              marginLeft:
                fixedSider && layout === 'side' && !isMobile
                  ? collapsed
                    ? collapsedWidth
                    : siderWidth
                  : 0,
            }}
            className="text-center transition-all duration-300"
          >
            {footer}
          </Footer>
        )}
      </Layout>
      {mobileMenuDrawer}
      {searchModal}
    </Layout>
  );
};
