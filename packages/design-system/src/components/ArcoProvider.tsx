/**
 * ArcoProvider - Arco Design System Provider
 *
 * Provides Arco Design system configuration and theme management
 * for the entire Katalyst application with seamless integration
 */

import { ConfigProvider } from '@arco-design/web-react';
import type React from 'react';
import { createContext, useContext, useEffect, useMemo } from 'react';
import '@arco-design/web-react/dist/css/arco.css';
import { type UseArcoConfig, useArco } from '../../hooks/use-arco';
import type { ArcoTheme } from '../../integrations/arco';
import { useDesignSystemStore } from '../design-system-store';

import deDE from '@arco-design/web-react/es/locale/de-DE';
// Locale imports
import enUS from '@arco-design/web-react/es/locale/en-US';
import esES from '@arco-design/web-react/es/locale/es-ES';
import frFR from '@arco-design/web-react/es/locale/fr-FR';
import itIT from '@arco-design/web-react/es/locale/it-IT';
import jaJP from '@arco-design/web-react/es/locale/ja-JP';
import koKR from '@arco-design/web-react/es/locale/ko-KR';
import ptBR from '@arco-design/web-react/es/locale/pt-BR';
import ruRU from '@arco-design/web-react/es/locale/ru-RU';
import zhCN from '@arco-design/web-react/es/locale/zh-CN';

export interface ArcoProviderProps {
  children: React.ReactNode;
  config?: UseArcoConfig;

  // Override specific settings
  theme?: Partial<ArcoTheme>;
  locale?: string;
  rtl?: boolean;

  // Component prefixes
  prefixCls?: string;
  iconPrefixCls?: string;

  // Features
  size?: 'mini' | 'small' | 'default' | 'large';
  autoInsertSpaceInButton?: boolean;

  // Custom configurations
  componentConfig?: {
    [componentName: string]: any;
  };

  // Performance
  virtual?: boolean;
  renderEmpty?: () => React.ReactNode;
}

// Context for Arco integration
const ArcoContext = createContext<ReturnType<typeof useArco> | null>(null);

export const useArcoContext = () => {
  const context = useContext(ArcoContext);
  if (!context) {
    throw new Error('useArcoContext must be used within an ArcoProvider');
  }
  return context;
};

// Locale mapping
const localeMap = {
  'en-US': enUS,
  'zh-CN': zhCN,
  'ja-JP': jaJP,
  'ko-KR': koKR,
  'fr-FR': frFR,
  'de-DE': deDE,
  'es-ES': esES,
  'it-IT': itIT,
  'ru-RU': ruRU,
  'pt-BR': ptBR,
};

export const ArcoProvider: React.FC<ArcoProviderProps> = ({
  children,
  config = {},
  theme = {},
  locale = 'en-US',
  rtl = false,
  prefixCls = 'arco',
  iconPrefixCls = 'arco-icon',
  size = 'default',
  autoInsertSpaceInButton = true,
  componentConfig = {},
  virtual = true,
  renderEmpty,
}) => {
  const { activeTheme } = useDesignSystemStore();

  // Initialize Arco hook with merged configuration
  const arcoConfig: UseArcoConfig = {
    locale,
    rtl,
    syncWithDesignSystem: true,
    autoDetectTheme: true,
    theme,
    ...config,
  };

  const arco = useArco(arcoConfig);

  // Dynamic theme configuration based on current theme
  const themeConfig = useMemo(() => {
    const baseTheme = {
      token: {
        colorPrimary: arco.currentTheme.primaryColor,
        colorSuccess: arco.currentTheme.successColor,
        colorWarning: arco.currentTheme.warningColor,
        colorError: arco.currentTheme.errorColor,
        colorInfo: arco.currentTheme.infoColor,
        borderRadius: arco.currentTheme.borderRadius,
        fontSize: arco.currentTheme.fontSize,
        fontFamily: arco.currentTheme.fontFamily,
        boxShadow: arco.currentTheme.boxShadow,
      },
    };

    // Dark mode adjustments
    if (arco.isDarkMode) {
      return {
        ...baseTheme,
        algorithm: 'dark',
        token: {
          ...baseTheme.token,
          colorBgContainer: '#232324',
          colorBgElevated: '#2a2a2b',
          colorBgLayout: '#17171a',
          colorText: '#ffffff',
          colorTextSecondary: '#c9cdd4',
          colorBorder: '#42434b',
          colorBorderSecondary: '#3c3c3f',
        },
      };
    }

    return baseTheme;
  }, [arco.currentTheme, arco.isDarkMode]);

  // Get locale configuration
  const localeConfig = useMemo(() => {
    return localeMap[locale as keyof typeof localeMap] || enUS;
  }, [locale]);

  // Inject CSS custom properties for theme
  useEffect(() => {
    if (arco.isInitialized) {
      const css = arco.generateCSS();

      // Create or update style element
      let styleElement = document.getElementById('katalyst-arco-theme');
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'katalyst-arco-theme';
        document.head.appendChild(styleElement);
      }

      styleElement.textContent = css;
    }
  }, [arco.isInitialized, arco.generateCSS]);

  // Error boundary for Arco components
  if (arco.error) {
    console.error('Arco Provider Error:', arco.error);
    return (
      <div className="arco-error-boundary p-4 bg-red-50 border border-red-200 rounded">
        <h3 className="text-red-800 font-semibold mb-2">Arco Design System Error</h3>
        <p className="text-red-700">{arco.error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reload Page
        </button>
      </div>
    );
  }

  // Loading state
  if (!arco.isInitialized) {
    return (
      <div className="arco-loading flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading Arco Design System...</p>
        </div>
      </div>
    );
  }

  return (
    <ArcoContext.Provider value={arco}>
      <ConfigProvider
        locale={localeConfig}
        prefixCls={prefixCls}
        iconPrefixCls={iconPrefixCls}
        size={size}
        autoInsertSpaceInButton={autoInsertSpaceInButton}
        renderEmpty={renderEmpty}
        componentConfig={{
          // Global component configurations
          Table: {
            size: 'default',
            pagination: {
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total: number, range: [number, number]) =>
                `${range[0]}-${range[1]} of ${total} items`,
            },
            virtual,
          },
          Form: {
            requiredSymbol: true,
            colon: true,
            validateTrigger: 'onChange',
          },
          Input: {
            allowClear: true,
          },
          Select: {
            allowClear: true,
            showSearch: true,
            virtual,
          },
          DatePicker: {
            allowClear: true,
          },
          Button: {
            autoInsertSpace: autoInsertSpaceInButton,
          },
          Modal: {
            confirmLoading: false,
            maskClosable: true,
            keyboard: true,
          },
          Drawer: {
            maskClosable: true,
            keyboard: true,
          },
          Message: {
            duration: 3000,
            position: 'top',
            maxCount: 3,
          },
          Notification: {
            duration: 4500,
            position: 'topRight',
            maxCount: 5,
          },
          // Custom component configurations
          ...componentConfig,
        }}
        theme={themeConfig}
        rtl={rtl}
      >
        <div
          className={`katalyst-arco-app ${arco.isDarkMode ? 'dark' : 'light'}`}
          dir={rtl ? 'rtl' : 'ltr'}
        >
          {children}
        </div>
      </ConfigProvider>
    </ArcoContext.Provider>
  );
};

// Higher-order component for Arco integration
export const withArco = <P extends object>(Component: React.ComponentType<P>) => {
  const WrappedComponent = (props: P) => (
    <ArcoProvider>
      <Component {...props} />
    </ArcoProvider>
  );

  WrappedComponent.displayName = `withArco(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

export default ArcoProvider;
