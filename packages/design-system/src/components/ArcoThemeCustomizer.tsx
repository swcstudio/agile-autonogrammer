/**
 * ArcoThemeCustomizer - Advanced Theme Customization Interface
 *
 * Provides a comprehensive theme customization interface for Arco Design
 * with real-time preview, color palette generation, and export capabilities
 */

import {
  IconCode,
  IconCopy,
  IconDownload,
  IconEye,
  IconPalette,
  IconRefresh,
  IconSave,
  IconUpload,
} from '@arco-design/icons';
import {
  Button,
  Card,
  Col,
  Collapse,
  ColorPicker,
  Divider,
  Form,
  Input,
  Message,
  Modal,
  Row,
  Select,
  Slider,
  Space,
  Switch,
  Tabs,
  Typography,
} from '@arco-design/web-react';
import { AnimatePresence, motion } from 'framer-motion';
import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import type { ArcoTheme } from '../../integrations/arco';
import { cn } from '../../utils';
import { useArcoContext } from './ArcoProvider';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;

export interface ArcoThemeCustomizerProps {
  className?: string;
  defaultExpanded?: boolean;
  showPreview?: boolean;
  onThemeChange?: (theme: ArcoTheme) => void;
  onExport?: (theme: string) => void;
  onImport?: (theme: ArcoTheme) => void;
}

interface ColorPalette {
  name: string;
  colors: {
    primary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
}

const predefinedPalettes: ColorPalette[] = [
  {
    name: 'Default',
    colors: {
      primary: '#165DFF',
      success: '#00B42A',
      warning: '#FF7D00',
      error: '#F53F3F',
      info: '#722ED1',
    },
  },
  {
    name: 'Sunset',
    colors: {
      primary: '#FF6B35',
      success: '#4CAF50',
      warning: '#FFA726',
      error: '#E57373',
      info: '#9C27B0',
    },
  },
  {
    name: 'Ocean',
    colors: {
      primary: '#0288D1',
      success: '#26A69A',
      warning: '#FFB74D',
      error: '#EF5350',
      info: '#5C6BC0',
    },
  },
  {
    name: 'Forest',
    colors: {
      primary: '#388E3C',
      success: '#66BB6A',
      warning: '#FFA726',
      error: '#E57373',
      info: '#7986CB',
    },
  },
  {
    name: 'Purple Dream',
    colors: {
      primary: '#7B1FA2',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336',
      info: '#3F51B5',
    },
  },
];

const fontFamilies = [
  {
    label: 'System Default',
    value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial',
  },
  { label: 'Inter', value: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  { label: 'Roboto', value: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  {
    label: 'Open Sans',
    value: '"Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  { label: 'Lato', value: 'Lato, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  {
    label: 'Montserrat',
    value: 'Montserrat, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  {
    label: 'Source Sans Pro',
    value: '"Source Sans Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  { label: 'Nunito', value: 'Nunito, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
];

export const ArcoThemeCustomizer: React.FC<ArcoThemeCustomizerProps> = ({
  className,
  defaultExpanded = false,
  showPreview = true,
  onThemeChange,
  onExport,
  onImport,
}) => {
  const {
    currentTheme,
    updateTheme,
    resetTheme,
    exportTheme,
    importTheme,
    isDarkMode,
    toggleDarkMode,
  } = useArcoContext();

  // State
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [workingTheme, setWorkingTheme] = useState<ArcoTheme>(currentTheme);
  const [selectedPalette, setSelectedPalette] = useState<string>('Default');

  // Color manipulation utilities
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: Number.parseInt(result[1], 16),
          g: Number.parseInt(result[2], 16),
          b: Number.parseInt(result[3], 16),
        }
      : null;
  };

  const rgbToHex = (r: number, g: number, b: number) => {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  const adjustBrightness = (hex: string, percent: number) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const adjust = (value: number) => {
      const adjusted = Math.round(value * (1 + percent / 100));
      return Math.max(0, Math.min(255, adjusted));
    };

    return rgbToHex(adjust(rgb.r), adjust(rgb.g), adjust(rgb.b));
  };

  // Theme update handler
  const handleThemeUpdate = useCallback(
    (updates: Partial<ArcoTheme>) => {
      const newTheme = { ...workingTheme, ...updates };
      setWorkingTheme(newTheme);
      updateTheme(updates);
      onThemeChange?.(newTheme);
    },
    [workingTheme, updateTheme, onThemeChange]
  );

  // Apply predefined palette
  const applyPalette = useCallback(
    (palette: ColorPalette) => {
      handleThemeUpdate({
        primaryColor: palette.colors.primary,
        successColor: palette.colors.success,
        warningColor: palette.colors.warning,
        errorColor: palette.colors.error,
        infoColor: palette.colors.info,
      });
      setSelectedPalette(palette.name);
    },
    [handleThemeUpdate]
  );

  // Export theme
  const handleExport = useCallback(() => {
    const themeData = exportTheme();
    onExport?.(themeData);

    // Copy to clipboard
    navigator.clipboard.writeText(themeData).then(() => {
      Message.success('Theme exported to clipboard!');
    });

    setExportModalVisible(false);
  }, [exportTheme, onExport]);

  // Import theme
  const handleImport = useCallback(
    (themeData: string) => {
      try {
        importTheme(themeData);
        const imported = JSON.parse(themeData);
        setWorkingTheme(imported);
        onImport?.(imported);
        Message.success('Theme imported successfully!');
        setImportModalVisible(false);
      } catch (error) {
        Message.error('Invalid theme format!');
      }
    },
    [importTheme, onImport]
  );

  // Generate preview styles
  const previewStyles = useMemo(
    () => ({
      '--arco-primary': workingTheme.primaryColor,
      '--arco-success': workingTheme.successColor,
      '--arco-warning': workingTheme.warningColor,
      '--arco-error': workingTheme.errorColor,
      '--arco-info': workingTheme.infoColor,
      '--arco-border-radius': `${workingTheme.borderRadius}px`,
      '--arco-font-size': `${workingTheme.fontSize}px`,
      '--arco-font-family': workingTheme.fontFamily,
      '--arco-box-shadow': workingTheme.boxShadow,
    }),
    [workingTheme]
  );

  return (
    <div className={cn('arco-theme-customizer', className)}>
      <Card
        title={
          <Space>
            <IconPalette />
            <span>Theme Customizer</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              type="text"
              icon={<IconRefresh />}
              onClick={() => {
                resetTheme();
                setWorkingTheme(currentTheme);
              }}
              title="Reset Theme"
            />
            <Button
              type="text"
              icon={<IconDownload />}
              onClick={() => setExportModalVisible(true)}
              title="Export Theme"
            />
            <Button
              type="text"
              icon={<IconUpload />}
              onClick={() => setImportModalVisible(true)}
              title="Import Theme"
            />
            {showPreview && (
              <Button
                type="text"
                icon={<IconEye />}
                onClick={() => setPreviewVisible(true)}
                title="Preview Theme"
              />
            )}
          </Space>
        }
        className="w-full"
      >
        <Tabs defaultActiveTab="colors" type="card">
          <TabPane key="colors" title="Colors">
            <div className="space-y-6">
              {/* Predefined Palettes */}
              <div>
                <Title heading={6} className="mb-3">
                  Predefined Palettes
                </Title>
                <Row gutter={16}>
                  {predefinedPalettes.map((palette) => (
                    <Col span={6} key={palette.name}>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Card
                          size="small"
                          className={cn(
                            'cursor-pointer transition-all duration-200',
                            selectedPalette === palette.name
                              ? 'ring-2 ring-primary-500 shadow-lg'
                              : 'hover:shadow-md'
                          )}
                          onClick={() => applyPalette(palette)}
                        >
                          <div className="text-center">
                            <div className="flex justify-center space-x-1 mb-2">
                              {Object.values(palette.colors).map((color, index) => (
                                <div
                                  key={index}
                                  className="w-4 h-4 rounded"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                            <Text className="text-xs">{palette.name}</Text>
                          </div>
                        </Card>
                      </motion.div>
                    </Col>
                  ))}
                </Row>
              </div>

              <Divider />

              {/* Individual Color Controls */}
              <Form layout="vertical">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Primary Color">
                      <div className="flex items-center space-x-2">
                        <ColorPicker
                          value={workingTheme.primaryColor}
                          onChange={(color) => handleThemeUpdate({ primaryColor: color })}
                        />
                        <Input
                          value={workingTheme.primaryColor}
                          onChange={(color) => handleThemeUpdate({ primaryColor: color })}
                          style={{ width: '100px' }}
                        />
                      </div>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Success Color">
                      <div className="flex items-center space-x-2">
                        <ColorPicker
                          value={workingTheme.successColor}
                          onChange={(color) => handleThemeUpdate({ successColor: color })}
                        />
                        <Input
                          value={workingTheme.successColor}
                          onChange={(color) => handleThemeUpdate({ successColor: color })}
                          style={{ width: '100px' }}
                        />
                      </div>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Warning Color">
                      <div className="flex items-center space-x-2">
                        <ColorPicker
                          value={workingTheme.warningColor}
                          onChange={(color) => handleThemeUpdate({ warningColor: color })}
                        />
                        <Input
                          value={workingTheme.warningColor}
                          onChange={(color) => handleThemeUpdate({ warningColor: color })}
                          style={{ width: '100px' }}
                        />
                      </div>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Error Color">
                      <div className="flex items-center space-x-2">
                        <ColorPicker
                          value={workingTheme.errorColor}
                          onChange={(color) => handleThemeUpdate({ errorColor: color })}
                        />
                        <Input
                          value={workingTheme.errorColor}
                          onChange={(color) => handleThemeUpdate({ errorColor: color })}
                          style={{ width: '100px' }}
                        />
                      </div>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Info Color">
                      <div className="flex items-center space-x-2">
                        <ColorPicker
                          value={workingTheme.infoColor}
                          onChange={(color) => handleThemeUpdate({ infoColor: color })}
                        />
                        <Input
                          value={workingTheme.infoColor}
                          onChange={(color) => handleThemeUpdate({ infoColor: color })}
                          style={{ width: '100px' }}
                        />
                      </div>
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </div>
          </TabPane>

          <TabPane key="typography" title="Typography">
            <Form layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Font Family">
                    <Select
                      value={workingTheme.fontFamily}
                      onChange={(value) => handleThemeUpdate({ fontFamily: value })}
                      options={fontFamilies}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Font Size">
                    <Space>
                      <Slider
                        min={10}
                        max={20}
                        value={workingTheme.fontSize}
                        onChange={(value) => handleThemeUpdate({ fontSize: value })}
                        style={{ width: '150px' }}
                      />
                      <Text>{workingTheme.fontSize}px</Text>
                    </Space>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </TabPane>

          <TabPane key="spacing" title="Spacing & Layout">
            <Form layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Border Radius">
                    <Space>
                      <Slider
                        min={0}
                        max={20}
                        value={workingTheme.borderRadius}
                        onChange={(value) => handleThemeUpdate({ borderRadius: value })}
                        style={{ width: '150px' }}
                      />
                      <Text>{workingTheme.borderRadius}px</Text>
                    </Space>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Box Shadow">
                    <Input
                      value={workingTheme.boxShadow}
                      onChange={(value) => handleThemeUpdate({ boxShadow: value })}
                      placeholder="0 2px 8px rgba(0, 0, 0, 0.15)"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </TabPane>

          <TabPane key="advanced" title="Advanced">
            <Collapse defaultActiveKey={['custom-css']}>
              <Panel header="Custom CSS Variables" key="custom-css">
                <div className="space-y-4">
                  <Paragraph type="secondary">
                    Advanced CSS customization using CSS custom properties.
                  </Paragraph>
                  <div
                    className="p-4 bg-gray-50 rounded font-mono text-sm overflow-auto max-h-60"
                    style={previewStyles}
                  >
                    {Object.entries(previewStyles).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-blue-600">{key}</span>: {value};
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>

              <Panel header="Dark Mode Settings" key="dark-mode">
                <Form layout="vertical">
                  <Form.Item label="Enable Dark Mode">
                    <Switch checked={isDarkMode} onChange={toggleDarkMode} />
                  </Form.Item>
                </Form>
              </Panel>
            </Collapse>
          </TabPane>
        </Tabs>
      </Card>

      {/* Export Modal */}
      <Modal
        title="Export Theme"
        visible={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        footer={
          <Space>
            <Button onClick={() => setExportModalVisible(false)}>Cancel</Button>
            <Button type="primary" onClick={handleExport}>
              Copy to Clipboard
            </Button>
          </Space>
        }
      >
        <Paragraph>
          Copy the theme configuration below to save or share your custom theme:
        </Paragraph>
        <div className="p-4 bg-gray-50 rounded font-mono text-sm max-h-60 overflow-auto">
          <pre>{exportTheme()}</pre>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal
        title="Import Theme"
        visible={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        footer={null}
      >
        <Form onSubmit={(values) => handleImport(values.themeData)}>
          <Form.Item
            field="themeData"
            label="Theme Configuration"
            rules={[{ required: true, message: 'Please enter theme data' }]}
          >
            <Input.TextArea rows={10} placeholder="Paste your theme configuration here..." />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={() => setImportModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                Import Theme
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Preview Modal */}
      <Modal
        title="Theme Preview"
        visible={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width="80%"
        style={{ top: '20px' }}
      >
        <div style={previewStyles} className="space-y-4">
          <ThemePreviewComponents theme={workingTheme} />
        </div>
      </Modal>
    </div>
  );
};

// Preview Components
const ThemePreviewComponents: React.FC<{ theme: ArcoTheme }> = ({ theme }) => (
  <div className="space-y-6">
    <Row gutter={16}>
      <Col span={8}>
        <Button type="primary" size="large" long>
          Primary Button
        </Button>
      </Col>
      <Col span={8}>
        <Button status="success" size="large" long>
          Success Button
        </Button>
      </Col>
      <Col span={8}>
        <Button status="warning" size="large" long>
          Warning Button
        </Button>
      </Col>
    </Row>

    <Card title="Sample Card" extra={<Button type="text">Action</Button>}>
      <Paragraph>
        This is a preview of how your theme will look across different components. The colors,
        typography, and spacing will be applied consistently.
      </Paragraph>
      <Space>
        <Button type="primary">Primary</Button>
        <Button type="secondary">Secondary</Button>
        <Button type="outline">Outline</Button>
      </Space>
    </Card>

    <Form layout="vertical">
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Input Field">
            <Input placeholder="Sample input" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Select Field">
            <Select placeholder="Select option" />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  </div>
);

export default ArcoThemeCustomizer;
