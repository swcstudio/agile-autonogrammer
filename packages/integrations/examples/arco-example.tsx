import React from 'react';
import { Button, Space, ConfigProvider, Grid } from '@arco-design/web-react';
import '@arco-design/web-react/dist/css/arco.css';

/**
 * Arco Design Integration Example
 * Demonstrates the usage of Arco Design components in Katalyst
 */
export const ArcoExample: React.FC = () => {
  return (
    <ConfigProvider>
      <div style={{ padding: '20px' }}>
        <h2>Arco Design Components</h2>
        
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Button Examples */}
          <div>
            <h3>Buttons</h3>
            <Space>
              <Button type="primary">Primary</Button>
              <Button type="secondary">Secondary</Button>
              <Button type="dashed">Dashed</Button>
              <Button type="text">Text</Button>
              <Button type="outline">Outline</Button>
            </Space>
          </div>

          {/* Grid System */}
          <div>
            <h3>Grid System</h3>
            <Grid.Row gutter={16}>
              <Grid.Col span={8}>
                <div style={{ background: '#165dff', padding: '10px', color: 'white' }}>
                  Col-8
                </div>
              </Grid.Col>
              <Grid.Col span={8}>
                <div style={{ background: '#14c9c9', padding: '10px', color: 'white' }}>
                  Col-8
                </div>
              </Grid.Col>
              <Grid.Col span={8}>
                <div style={{ background: '#722ed1', padding: '10px', color: 'white' }}>
                  Col-8
                </div>
              </Grid.Col>
            </Grid.Row>
          </div>
        </Space>
      </div>
    </ConfigProvider>
  );
};

export default ArcoExample;