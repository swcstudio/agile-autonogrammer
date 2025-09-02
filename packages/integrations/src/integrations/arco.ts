export interface ArcoConfig {
  theme: ArcoTheme;
  components: string[];
  icons: string[];
  locale: string;
  rtl: boolean;
  prefixCls: string;
}

export interface ArcoTheme {
  primaryColor: string;
  successColor: string;
  warningColor: string;
  errorColor: string;
  infoColor: string;
  borderRadius: number;
  fontSize: number;
  fontFamily: string;
  boxShadow: string;
}

export interface ArcoComponent {
  name: string;
  props: Record<string, any>;
  variants: string[];
  customizable: boolean;
}

export class ArcoIntegration {
  private config: ArcoConfig;

  constructor(config: ArcoConfig) {
    this.config = config;
  }

  async setupArco() {
    return {
      name: 'arco-design',
      setup: () => ({
        components: this.getArcoComponents(),
        theme: this.generateTheme(),
        icons: this.getArcoIcons(),
        locale: this.config.locale || 'en-US',
        rtl: this.config.rtl || false,
        prefixCls: this.config.prefixCls || 'arco',
        features: {
          darkMode: true,
          customTheme: true,
          treeShaking: true,
          typescript: true,
          accessibility: true,
          responsive: true,
        },
      }),
      plugins: ['unplugin-react-arco', '@arco-design/webpack-plugin', 'babel-plugin-import'],
      dependencies: [
        '@arco-design/web-react',
        '@arco-design/color',
        '@arco-themes/react-arco-pro',
        'unplugin-react-arco',
      ],
    };
  }

  private generateTheme(): ArcoTheme {
    return {
      primaryColor: this.config.theme?.primaryColor || '#165DFF',
      successColor: this.config.theme?.successColor || '#00B42A',
      warningColor: this.config.theme?.warningColor || '#FF7D00',
      errorColor: this.config.theme?.errorColor || '#F53F3F',
      infoColor: this.config.theme?.infoColor || '#722ED1',
      borderRadius: this.config.theme?.borderRadius || 2,
      fontSize: this.config.theme?.fontSize || 14,
      fontFamily:
        this.config.theme?.fontFamily ||
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      boxShadow: this.config.theme?.boxShadow || '0 2px 8px rgba(0, 0, 0, 0.15)',
    };
  }

  private getArcoComponents(): ArcoComponent[] {
    return [
      {
        name: 'Button',
        props: {
          type: ['primary', 'secondary', 'outline', 'dashed', 'text'],
          size: ['mini', 'small', 'default', 'large'],
          status: ['warning', 'danger', 'success'],
          shape: ['square', 'round', 'circle'],
        },
        variants: ['solid', 'outline', 'ghost'],
        customizable: true,
      },
      {
        name: 'Input',
        props: {
          size: ['mini', 'small', 'default', 'large'],
          status: ['warning', 'error'],
          allowClear: true,
          disabled: false,
          readOnly: false,
        },
        variants: ['default', 'borderless'],
        customizable: true,
      },
      {
        name: 'Select',
        props: {
          size: ['mini', 'small', 'default', 'large'],
          mode: ['multiple', 'tags'],
          allowClear: true,
          allowCreate: true,
          showSearch: true,
        },
        variants: ['default', 'borderless'],
        customizable: true,
      },
      {
        name: 'Table',
        props: {
          size: ['mini', 'small', 'default', 'large'],
          bordered: true,
          stripe: true,
          hover: true,
          pagination: true,
          loading: false,
        },
        variants: ['default', 'card'],
        customizable: true,
      },
      {
        name: 'Form',
        props: {
          layout: ['horizontal', 'vertical', 'inline'],
          size: ['mini', 'small', 'default', 'large'],
          labelAlign: ['left', 'right'],
          requiredSymbol: true,
          colon: true,
        },
        variants: ['default', 'card'],
        customizable: true,
      },
      {
        name: 'Card',
        props: {
          size: ['small', 'default'],
          bordered: true,
          hoverable: true,
          loading: false,
          bodyStyle: {},
        },
        variants: ['default', 'inner'],
        customizable: true,
      },
      {
        name: 'Modal',
        props: {
          visible: false,
          confirmLoading: false,
          closable: true,
          mask: true,
          maskClosable: true,
          keyboard: true,
        },
        variants: ['default', 'simple'],
        customizable: true,
      },
      {
        name: 'Drawer',
        props: {
          visible: false,
          closable: true,
          mask: true,
          maskClosable: true,
          placement: ['top', 'right', 'bottom', 'left'],
        },
        variants: ['default'],
        customizable: true,
      },
      {
        name: 'Notification',
        props: {
          type: ['info', 'success', 'warning', 'error'],
          duration: 4500,
          closable: true,
          showIcon: true,
        },
        variants: ['default'],
        customizable: false,
      },
      {
        name: 'Message',
        props: {
          type: ['info', 'success', 'warning', 'error', 'loading'],
          duration: 3000,
          closable: false,
          showIcon: true,
        },
        variants: ['default'],
        customizable: false,
      },
    ];
  }

  private getArcoIcons(): string[] {
    return [
      'IconHome',
      'IconUser',
      'IconSettings',
      'IconSearch',
      'IconPlus',
      'IconMinus',
      'IconEdit',
      'IconDelete',
      'IconSave',
      'IconClose',
      'IconCheck',
      'IconInfo',
      'IconWarning',
      'IconError',
      'IconSuccess',
      'IconLoading',
      'IconArrowUp',
      'IconArrowDown',
      'IconArrowLeft',
      'IconArrowRight',
      'IconCalendar',
      'IconClock',
      'IconFile',
      'IconFolder',
      'IconImage',
      'IconVideo',
      'IconMusic',
      'IconDownload',
      'IconUpload',
      'IconShare',
      'IconCopy',
      'IconPrint',
      'IconRefresh',
      'IconMore',
      'IconMenu',
      'IconFilter',
      'IconSort',
      'IconEye',
      'IconEyeInvisible',
      'IconHeart',
      'IconStar',
      'IconThumbUp',
      'IconThumbDown',
    ];
  }

  async setupUnpluginReact() {
    return {
      name: 'unplugin-react-arco',
      setup: () => ({
        theme: '@arco-themes/react-arco-pro',
        vars: {
          '--primary-6': this.config.theme?.primaryColor || '#165DFF',
          '--success-6': this.config.theme?.successColor || '#00B42A',
          '--warning-6': this.config.theme?.warningColor || '#FF7D00',
          '--danger-6': this.config.theme?.errorColor || '#F53F3F',
          '--arcoblue-6': this.config.theme?.infoColor || '#722ED1',
        },
        modifyVars: {
          'arcoblue-6': this.config.theme?.primaryColor || '#165DFF',
          'green-6': this.config.theme?.successColor || '#00B42A',
          'orange-6': this.config.theme?.warningColor || '#FF7D00',
          'red-6': this.config.theme?.errorColor || '#F53F3F',
          'purple-6': this.config.theme?.infoColor || '#722ED1',
        },
        importStyle: 'less',
        resolveComponent: (name: string) => {
          return name.startsWith('A') ? `@arco-design/web-react/es/${name.slice(1)}` : false;
        },
      }),
    };
  }

  async setupCustomTheme() {
    return {
      name: 'arco-custom-theme',
      setup: () => ({
        generator: {
          primaryColor: this.config.theme?.primaryColor || '#165DFF',
          successColor: this.config.theme?.successColor || '#00B42A',
          warningColor: this.config.theme?.warningColor || '#FF7D00',
          errorColor: this.config.theme?.errorColor || '#F53F3F',
          infoColor: this.config.theme?.infoColor || '#722ED1',
          borderRadius: this.config.theme?.borderRadius || 2,
          fontSize: this.config.theme?.fontSize || 14,
        },
        darkMode: {
          enabled: true,
          algorithm: 'dark',
          variables: {
            '--color-bg-1': '#17171a',
            '--color-bg-2': '#232324',
            '--color-bg-3': '#2a2a2b',
            '--color-bg-4': '#313132',
            '--color-bg-5': '#373739',
          },
        },
        customVariables: {
          '--katalyst-primary': this.config.theme?.primaryColor || '#165DFF',
          '--katalyst-secondary': '#86909C',
          '--katalyst-accent': '#722ED1',
          '--katalyst-neutral': '#F7F8FA',
        },
      }),
    };
  }

  async setupDesignTokens() {
    return {
      name: 'arco-design-tokens',
      setup: () => ({
        tokens: {
          color: {
            primary: this.config.theme?.primaryColor || '#165DFF',
            success: this.config.theme?.successColor || '#00B42A',
            warning: this.config.theme?.warningColor || '#FF7D00',
            error: this.config.theme?.errorColor || '#F53F3F',
            info: this.config.theme?.infoColor || '#722ED1',
            neutral: {
              1: '#F7F8FA',
              2: '#F2F3F5',
              3: '#E5E6EB',
              4: '#C9CDD4',
              5: '#A9AEB8',
              6: '#86909C',
              7: '#6B7785',
              8: '#4E5969',
              9: '#272E3B',
              10: '#1D2129',
            },
          },
          spacing: {
            xs: '4px',
            sm: '8px',
            md: '12px',
            lg: '16px',
            xl: '20px',
            xxl: '24px',
          },
          typography: {
            fontFamily:
              this.config.theme?.fontFamily ||
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
            fontSize: {
              xs: '12px',
              sm: '14px',
              md: '16px',
              lg: '18px',
              xl: '20px',
              xxl: '24px',
            },
            fontWeight: {
              normal: 400,
              medium: 500,
              semibold: 600,
              bold: 700,
            },
            lineHeight: {
              tight: 1.25,
              normal: 1.5,
              relaxed: 1.75,
            },
          },
          borderRadius: {
            none: '0px',
            sm: '2px',
            md: '4px',
            lg: '6px',
            xl: '8px',
            full: '9999px',
          },
          shadow: {
            sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
            md: '0 2px 8px rgba(0, 0, 0, 0.15)',
            lg: '0 4px 16px rgba(0, 0, 0, 0.15)',
            xl: '0 8px 24px rgba(0, 0, 0, 0.15)',
          },
        },
      }),
    };
  }

  async initialize() {
    const integrations = await Promise.all([
      this.setupArco(),
      this.setupUnpluginReact(),
      this.setupCustomTheme(),
      this.setupDesignTokens(),
    ]);

    return integrations.filter(Boolean);
  }

  getComponentExamples() {
    return {
      Button: `
        import { Button } from '@arco-design/web-react';
        
        <Button type="primary" size="large">
          Primary Button
        </Button>
      `,
      Form: `
        import { Form, Input, Button } from '@arco-design/web-react';
        
        <Form layout="vertical">
          <Form.Item label="Name" field="name" rules={[{ required: true }]}>
            <Input placeholder="Enter your name" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Submit
            </Button>
          </Form.Item>
        </Form>
      `,
      Table: `
        import { Table } from '@arco-design/web-react';
        
        const columns = [
          { title: 'Name', dataIndex: 'name' },
          { title: 'Age', dataIndex: 'age' },
          { title: 'Address', dataIndex: 'address' }
        ];
        
        <Table columns={columns} data={data} pagination />
      `,
    };
  }

  getTypeDefinitions() {
    return `
      interface ArcoTheme {
        primaryColor: string;
        successColor: string;
        warningColor: string;
        errorColor: string;
        infoColor: string;
        borderRadius: number;
        fontSize: number;
        fontFamily: string;
        boxShadow: string;
      }

      interface ArcoComponent {
        name: string;
        props: Record<string, any>;
        variants: string[];
        customizable: boolean;
      }

      interface ArcoDesignTokens {
        color: Record<string, any>;
        spacing: Record<string, string>;
        typography: Record<string, any>;
        borderRadius: Record<string, string>;
        shadow: Record<string, string>;
      }

      declare module '@arco-design/web-react' {
        export const Button: React.ComponentType<any>;
        export const Input: React.ComponentType<any>;
        export const Select: React.ComponentType<any>;
        export const Table: React.ComponentType<any>;
        export const Form: React.ComponentType<any>;
        export const Card: React.ComponentType<any>;
        export const Modal: React.ComponentType<any>;
        export const Drawer: React.ComponentType<any>;
        export const Notification: any;
        export const Message: any;
      }
    `;
  }
}
