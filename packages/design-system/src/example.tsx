/**
 * Katalyst Design System - Example Usage
 *
 * This file demonstrates how to use the Katalyst Design System
 * with all its features including Ant Design Pro components,
 * Aceternity UI effects, and mobile optimization.
 */

import {
  BarChartOutlined,
  BellOutlined,
  DashboardOutlined,
  FileOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import React, { useState } from 'react';
import {
  AnimatedButton,
  AnimatedButtonPresets,
  GlowCard,
  GlowCardPresets,
  KatalystDesignSystem,
  MobileNav,
  ProForm,
  ProLayout,
  useDesignSystemStore,
  useIsMobile,
} from './index';

// Example App Component
export const ExampleApp = () => {
  return (
    <KatalystDesignSystem framework="core">
      <MainLayout />
    </KatalystDesignSystem>
  );
};

// Main Layout with ProLayout
const MainLayout = () => {
  const isMobile = useIsMobile();
  const [selectedKey, setSelectedKey] = useState('dashboard');

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'users',
      icon: <TeamOutlined />,
      label: 'Users',
      children: [
        { key: 'users-list', label: 'All Users' },
        { key: 'users-roles', label: 'Roles & Permissions' },
      ],
    },
    {
      key: 'analytics',
      icon: <BarChartOutlined />,
      label: 'Analytics',
    },
    {
      key: 'documents',
      icon: <FileOutlined />,
      label: 'Documents',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
  ];

  const mobileNavItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'Home' },
    { key: 'users', icon: <UserOutlined />, label: 'Users' },
    { key: 'analytics', icon: <BarChartOutlined />, label: 'Stats' },
    { key: 'settings', icon: <SettingOutlined />, label: 'Settings' },
  ];

  return (
    <>
      <ProLayout
        title="Katalyst App"
        logo={<div className="w-8 h-8 bg-primary rounded" />}
        layout={isMobile ? 'top' : 'side'}
        menuItems={menuItems}
        selectedKeys={[selectedKey]}
        onMenuClick={({ key }) => setSelectedKey(key as string)}
        showSearch
        showNotifications
        notificationCount={3}
        userName="John Doe"
        userAvatar="https://api.dicebear.com/7.x/avataaars/svg?seed=John"
        footer="© 2025 Katalyst. All rights reserved."
      >
        <div className="p-6">
          {selectedKey === 'dashboard' && <DashboardContent />}
          {selectedKey === 'users' && <UsersContent />}
          {selectedKey === 'analytics' && <AnalyticsContent />}
          {selectedKey === 'settings' && <SettingsContent />}
        </div>
      </ProLayout>

      {/* Mobile Navigation */}
      {isMobile && (
        <MobileNav
          variant="dock"
          items={mobileNavItems}
          activeKey={selectedKey}
          onChange={setSelectedKey}
          enableHaptic
        />
      )}
    </>
  );
};

// Dashboard Content with GlowCards
const DashboardContent = () => {
  const stats = [
    { title: 'Total Users', value: '1,234', change: '+12%', color: '#3b82f6' },
    { title: 'Revenue', value: '$45,678', change: '+23%', color: '#10b981' },
    { title: 'Active Sessions', value: '89', change: '-5%', color: '#f59e0b' },
    { title: 'Conversion Rate', value: '3.45%', change: '+0.5%', color: '#8b5cf6' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <GlowCard key={index} variant="glow" glowColor={stat.color} hoverable>
            <div className="text-sm text-muted-foreground">{stat.title}</div>
            <div className="text-2xl font-bold mt-2">{stat.value}</div>
            <div
              className={`text-sm mt-1 ${
                stat.change.startsWith('+') ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {stat.change} from last month
            </div>
          </GlowCard>
        ))}
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlowCard {...GlowCardPresets.feature}>
          <h3 className="text-xl font-semibold mb-3">Quick Actions</h3>
          <div className="space-y-3">
            <AnimatedButton {...AnimatedButtonPresets.primary} block>
              Create New User
            </AnimatedButton>
            <AnimatedButton variant="shimmer" block>
              Generate Report
            </AnimatedButton>
            <AnimatedButton variant="gradient" gradientFrom="#8b5cf6" gradientTo="#ec4899" block>
              Launch Campaign
            </AnimatedButton>
          </div>
        </GlowCard>

        <GlowCard variant="holographic" hoverable>
          <h3 className="text-xl font-semibold mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {['User registered', 'Payment received', 'Report generated', 'Settings updated'].map(
              (activity, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <span className="text-sm">{activity}</span>
                  <span className="text-xs text-muted-foreground">{i + 1}m ago</span>
                </div>
              )
            )}
          </div>
        </GlowCard>
      </div>
    </div>
  );
};

// Users Content with ProForm
const UsersContent = () => {
  const handleSubmit = async (values: any) => {
    console.log('Form submitted:', values);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">User Management</h1>

      <GlowCard variant="glass">
        <h2 className="text-xl font-semibold mb-4">Create New User</h2>

        <ProForm
          sections={[
            {
              title: 'Personal Information',
              fields: [
                {
                  name: 'firstName',
                  label: 'First Name',
                  type: 'input',
                  rules: [{ required: true, message: 'First name is required' }],
                },
                {
                  name: 'lastName',
                  label: 'Last Name',
                  type: 'input',
                  rules: [{ required: true, message: 'Last name is required' }],
                },
                {
                  name: 'email',
                  label: 'Email',
                  type: 'input',
                  rules: [
                    { required: true, message: 'Email is required' },
                    { type: 'email', message: 'Invalid email format' },
                  ],
                },
                {
                  name: 'phone',
                  label: 'Phone Number',
                  type: 'input',
                },
              ],
            },
            {
              title: 'Account Settings',
              fields: [
                {
                  name: 'role',
                  label: 'Role',
                  type: 'select',
                  options: [
                    { label: 'Admin', value: 'admin' },
                    { label: 'Editor', value: 'editor' },
                    { label: 'Viewer', value: 'viewer' },
                  ],
                  rules: [{ required: true, message: 'Role is required' }],
                },
                {
                  name: 'department',
                  label: 'Department',
                  type: 'select',
                  options: [
                    { label: 'Engineering', value: 'engineering' },
                    { label: 'Marketing', value: 'marketing' },
                    { label: 'Sales', value: 'sales' },
                    { label: 'Support', value: 'support' },
                  ],
                },
                {
                  name: 'startDate',
                  label: 'Start Date',
                  type: 'date',
                },
                {
                  name: 'notifications',
                  label: 'Email Notifications',
                  type: 'switch',
                },
              ],
            },
          ]}
          columns={2}
          mobileColumns={1}
          onSubmit={handleSubmit}
          submitText="Create User"
          showReset
        />
      </GlowCard>
    </div>
  );
};

// Analytics Content with 3D Cards
const AnalyticsContent = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlowCard variant="3d" enableTilt>
          <h3 className="text-lg font-semibold mb-2">Page Views</h3>
          <div className="text-3xl font-bold">45.2K</div>
          <div className="text-sm text-muted-foreground mt-1">Last 30 days</div>
        </GlowCard>

        <GlowCard variant="aurora" auroraColors={['#3b82f6', '#8b5cf6', '#ec4899']}>
          <h3 className="text-lg font-semibold mb-2">Engagement Rate</h3>
          <div className="text-3xl font-bold">67.8%</div>
          <div className="text-sm text-muted-foreground mt-1">+5.2% from last period</div>
        </GlowCard>

        <GlowCard variant="spotlight">
          <h3 className="text-lg font-semibold mb-2">Conversion Rate</h3>
          <div className="text-3xl font-bold">3.45%</div>
          <div className="text-sm text-muted-foreground mt-1">Industry avg: 2.8%</div>
        </GlowCard>
      </div>
    </div>
  );
};

// Settings Content with Theme Controls
const SettingsContent = () => {
  const {
    themeMode,
    setThemeMode,
    componentSize,
    setComponentSize,
    animations,
    toggleAnimations,
    debugMode,
    toggleDebugMode,
  } = useDesignSystemStore();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <div className="max-w-2xl">
        <GlowCard variant="glass" className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Appearance</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Theme Mode</label>
              <div className="flex gap-3">
                {(['light', 'dark', 'system'] as const).map((mode) => (
                  <AnimatedButton
                    key={mode}
                    variant={themeMode === mode ? 'glow' : 'default'}
                    onClick={() => setThemeMode(mode)}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </AnimatedButton>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Component Size</label>
              <div className="flex gap-3">
                {(['small', 'middle', 'large'] as const).map((size) => (
                  <AnimatedButton
                    key={size}
                    variant={componentSize === size ? 'glow' : 'default'}
                    onClick={() => setComponentSize(size)}
                  >
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </AnimatedButton>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Animations</span>
              <AnimatedButton
                variant={animations ? 'gradient' : 'default'}
                onClick={toggleAnimations}
              >
                {animations ? 'Enabled' : 'Disabled'}
              </AnimatedButton>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Debug Mode</span>
              <AnimatedButton
                variant={debugMode ? 'gradient' : 'default'}
                onClick={toggleDebugMode}
              >
                {debugMode ? 'On' : 'Off'}
              </AnimatedButton>
            </div>
          </div>
        </GlowCard>

        <GlowCard variant="glass">
          <h2 className="text-xl font-semibold mb-4">About</h2>
          <p className="text-sm text-muted-foreground">
            Katalyst Design System v1.0.0
            <br />
            Built with Ant Design Pro, Aceternity UI, and React 19
            <br />© 2025 Katalyst Team
          </p>
        </GlowCard>
      </div>
    </div>
  );
};
