/**
 * ArcoShowcase - Complete Arco Design Component Showcase
 *
 * Demonstrates all Arco Design components with Katalyst enhancements,
 * animations, and integration with the design system
 */

import {
  IconDelete,
  IconDown,
  IconDownload,
  IconEdit,
  IconEye,
  IconEyeInvisible,
  IconHeart,
  IconHome,
  IconLeft,
  IconMore,
  IconPlus,
  IconRefresh,
  IconRight,
  IconSearch,
  IconSettings,
  IconStar,
  IconUp,
  IconUpload,
  IconUser,
} from '@arco-design/icons';
import {
  Affix,
  Alert,
  Anchor,
  AutoComplete,
  Avatar,
  BackTop,
  Badge,
  Breadcrumb,
  Button,
  Calendar,
  Card,
  Cascader,
  Checkbox,
  Col,
  Collapse,
  DatePicker,
  Divider,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Input,
  List,
  Mentions,
  Menu,
  Message,
  Modal,
  Notification,
  Pagination,
  Popover,
  Progress,
  Radio,
  Rate,
  Result,
  Row,
  Select,
  Skeleton,
  Slider,
  Space,
  Spin,
  Statistic,
  Steps,
  Switch,
  Table,
  Tabs,
  Tag,
  TimePicker,
  Timeline,
  Tooltip,
  Transfer,
  Tree,
  Typography,
  Upload,
} from '@arco-design/web-react';
import { AnimatePresence, motion } from 'framer-motion';
import type React from 'react';
import { useState } from 'react';
import { cn } from '../../utils';
import { Button as KatalystButton, Card as KatalystCard } from './ArcoComponents';
import { useArcoContext } from './ArcoProvider';
import ArcoThemeCustomizer from './ArcoThemeCustomizer';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;
const { Step } = Steps;
const { Panel } = Collapse;
const { Item: TimelineItem } = Timeline;
const { Group: RadioGroup } = Radio;
const { Group: CheckboxGroup } = Checkbox;

export interface ArcoShowcaseProps {
  className?: string;
  showThemeCustomizer?: boolean;
  sections?: string[];
}

// Sample data
const tableData = [
  { key: '1', name: 'Alice Johnson', age: 28, city: 'New York', email: 'alice@example.com' },
  { key: '2', name: 'Bob Smith', age: 32, city: 'San Francisco', email: 'bob@example.com' },
  { key: '3', name: 'Charlie Brown', age: 25, city: 'Chicago', email: 'charlie@example.com' },
  { key: '4', name: 'Diana Prince', age: 29, city: 'Los Angeles', email: 'diana@example.com' },
];

const tableColumns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age' },
  { title: 'City', dataIndex: 'city', key: 'city' },
  { title: 'Email', dataIndex: 'email', key: 'email' },
  {
    title: 'Actions',
    key: 'actions',
    render: () => (
      <Space>
        <Button type="text" icon={<IconEdit />} size="small" />
        <Button type="text" icon={<IconDelete />} size="small" status="danger" />
      </Space>
    ),
  },
];

const treeData = [
  {
    title: 'Trunk 0-0',
    key: '0-0',
    children: [
      { title: 'Branch 0-0-0', key: '0-0-0' },
      { title: 'Branch 0-0-1', key: '0-0-1' },
    ],
  },
  {
    title: 'Trunk 0-1',
    key: '0-1',
    children: [
      { title: 'Branch 0-1-0', key: '0-1-0' },
      { title: 'Branch 0-1-1', key: '0-1-1' },
    ],
  },
];

export const ArcoShowcase: React.FC<ArcoShowcaseProps> = ({
  className,
  showThemeCustomizer = true,
  sections = ['basic', 'forms', 'data-display', 'feedback', 'navigation', 'layout', 'enhanced'],
}) => {
  const { currentTheme, isDarkMode } = useArcoContext();

  // State for interactive examples
  const [modalVisible, setModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const handleFormSubmit = (values: any) => {
    console.log('Form submitted:', values);
    Message.success('Form submitted successfully!');
  };

  const showMessage = (type: 'info' | 'success' | 'warning' | 'error') => {
    Message[type](`This is a ${type} message!`);
  };

  const showNotification = (type: 'info' | 'success' | 'warning' | 'error') => {
    Notification[type]({
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Notification`,
      content: `This is a ${type} notification with some content.`,
    });
  };

  return (
    <div className={cn('arco-showcase', className)}>
      <div className="mb-8">
        <Title heading={1} className="text-center mb-4">
          Arco Design System Showcase
        </Title>
        <Paragraph className="text-center text-lg text-gray-600 mb-6">
          Complete demonstration of Arco Design components with Katalyst enhancements
        </Paragraph>

        {showThemeCustomizer && (
          <div className="mb-8">
            <ArcoThemeCustomizer defaultExpanded={false} />
          </div>
        )}
      </div>

      <Tabs type="card" defaultActiveTab="basic">
        {/* Basic Components */}
        {sections.includes('basic') && (
          <TabPane key="basic" title="Basic Components">
            <Row gutter={[16, 16]}>
              {/* Buttons */}
              <Col span={24}>
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.1 }}
                >
                  <Card title="Buttons" className="mb-4">
                    <Space wrap>
                      <Button type="primary">Primary</Button>
                      <Button type="secondary">Secondary</Button>
                      <Button type="outline">Outline</Button>
                      <Button type="dashed">Dashed</Button>
                      <Button type="text">Text</Button>
                      <Button status="success">Success</Button>
                      <Button status="warning">Warning</Button>
                      <Button status="danger">Danger</Button>
                      <Button loading>Loading</Button>
                      <Button disabled>Disabled</Button>
                    </Space>

                    <Divider orientation="left">Katalyst Enhanced Buttons</Divider>
                    <Space wrap>
                      <KatalystButton animation="scale" gradient>
                        Gradient Scale
                      </KatalystButton>
                      <KatalystButton animation="bounce" glow>
                        Glow Bounce
                      </KatalystButton>
                      <KatalystButton animation="pulse" type="primary">
                        Pulse Animation
                      </KatalystButton>
                      <KatalystButton animation="rotate" type="outline">
                        Rotate Effect
                      </KatalystButton>
                    </Space>

                    <Divider orientation="left">Button Sizes</Divider>
                    <Space>
                      <Button size="mini">Mini</Button>
                      <Button size="small">Small</Button>
                      <Button>Default</Button>
                      <Button size="large">Large</Button>
                    </Space>

                    <Divider orientation="left">Button Shapes</Divider>
                    <Space>
                      <Button shape="square" icon={<IconEdit />} />
                      <Button shape="round">Round Button</Button>
                      <Button shape="circle" icon={<IconSearch />} />
                    </Space>
                  </Card>
                </motion.div>
              </Col>

              {/* Icons & Typography */}
              <Col span={12}>
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.2 }}
                >
                  <Card title="Icons & Typography">
                    <Space wrap size="large">
                      <IconHome style={{ fontSize: 24 }} />
                      <IconUser style={{ fontSize: 24 }} />
                      <IconSettings style={{ fontSize: 24 }} />
                      <IconHeart style={{ fontSize: 24, color: '#f53f3f' }} />
                      <IconStar style={{ fontSize: 24, color: '#ffb400' }} />
                    </Space>

                    <Divider />

                    <Title heading={2}>Heading 2</Title>
                    <Title heading={3}>Heading 3</Title>
                    <Title heading={4}>Heading 4</Title>

                    <Paragraph>
                      This is a paragraph with <Text bold>bold text</Text>,
                      <Text italic> italic text</Text>, and
                      <Text underline> underlined text</Text>.
                    </Paragraph>

                    <Text type="secondary">Secondary text</Text>
                    <br />
                    <Text type="success">Success text</Text>
                    <br />
                    <Text type="warning">Warning text</Text>
                    <br />
                    <Text type="error">Error text</Text>
                  </Card>
                </motion.div>
              </Col>

              {/* Tags & Badges */}
              <Col span={12}>
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.3 }}
                >
                  <Card title="Tags & Badges">
                    <div className="space-y-4">
                      <div>
                        <Text className="block mb-2">Tags:</Text>
                        <Space wrap>
                          <Tag>Default</Tag>
                          <Tag color="blue">Blue</Tag>
                          <Tag color="green">Green</Tag>
                          <Tag color="orange">Orange</Tag>
                          <Tag color="red">Red</Tag>
                          <Tag closable>Closable</Tag>
                        </Space>
                      </div>

                      <div>
                        <Text className="block mb-2">Badges:</Text>
                        <Space size="large">
                          <Badge count={5}>
                            <Avatar shape="square" icon={<IconUser />} />
                          </Badge>
                          <Badge count={100} maxCount={99}>
                            <Avatar shape="square" icon={<IconUser />} />
                          </Badge>
                          <Badge dot>
                            <Avatar shape="square" icon={<IconUser />} />
                          </Badge>
                          <Badge status="processing" text="Processing" />
                          <Badge status="success" text="Success" />
                          <Badge status="error" text="Error" />
                        </Space>
                      </div>

                      <div>
                        <Text className="block mb-2">Avatars:</Text>
                        <Space>
                          <Avatar>A</Avatar>
                          <Avatar style={{ backgroundColor: '#165DFF' }}>
                            <IconUser />
                          </Avatar>
                          <Avatar size={40}>
                            <img src="https://via.placeholder.com/40" alt="avatar" />
                          </Avatar>
                          <Avatar.Group size={32}>
                            <Avatar>A</Avatar>
                            <Avatar>B</Avatar>
                            <Avatar>C</Avatar>
                            <Avatar>+2</Avatar>
                          </Avatar.Group>
                        </Space>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </Col>
            </Row>
          </TabPane>
        )}

        {/* Form Components */}
        {sections.includes('forms') && (
          <TabPane key="forms" title="Form Components">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.1 }}
                >
                  <Card title="Form Example">
                    <Form
                      form={form}
                      layout="vertical"
                      onSubmit={handleFormSubmit}
                      autoComplete="off"
                    >
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item
                            label="Name"
                            field="name"
                            rules={[{ required: true, message: 'Name is required' }]}
                          >
                            <Input placeholder="Enter your name" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            label="Email"
                            field="email"
                            rules={[
                              { required: true, message: 'Email is required' },
                              { type: 'email', message: 'Invalid email format' },
                            ]}
                          >
                            <Input placeholder="Enter your email" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            label="Country"
                            field="country"
                            rules={[{ required: true, message: 'Please select a country' }]}
                          >
                            <Select placeholder="Select your country" allowClear>
                              <Option value="us">United States</Option>
                              <Option value="uk">United Kingdom</Option>
                              <Option value="ca">Canada</Option>
                              <Option value="au">Australia</Option>
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="Date of Birth" field="dateOfBirth">
                            <DatePicker style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={24}>
                          <Form.Item label="Bio" field="bio">
                            <TextArea
                              placeholder="Tell us about yourself"
                              rows={4}
                              maxLength={500}
                              showWordLimit
                            />
                          </Form.Item>
                        </Col>
                        <Col span={24}>
                          <Form.Item label="Skills" field="skills">
                            <CheckboxGroup direction="horizontal">
                              <Checkbox value="javascript">JavaScript</Checkbox>
                              <Checkbox value="typescript">TypeScript</Checkbox>
                              <Checkbox value="react">React</Checkbox>
                              <Checkbox value="nodejs">Node.js</Checkbox>
                              <Checkbox value="python">Python</Checkbox>
                            </CheckboxGroup>
                          </Form.Item>
                        </Col>
                        <Col span={24}>
                          <Form.Item label="Experience Level" field="experience">
                            <RadioGroup>
                              <Radio value="beginner">Beginner</Radio>
                              <Radio value="intermediate">Intermediate</Radio>
                              <Radio value="advanced">Advanced</Radio>
                              <Radio value="expert">Expert</Radio>
                            </RadioGroup>
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="Newsletter Subscription" field="newsletter">
                            <Switch />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="Rating" field="rating">
                            <Rate />
                          </Form.Item>
                        </Col>
                        <Col span={24}>
                          <Form.Item>
                            <Space>
                              <Button type="primary" htmlType="submit">
                                Submit
                              </Button>
                              <Button onClick={() => form.resetFields()}>Reset</Button>
                            </Space>
                          </Form.Item>
                        </Col>
                      </Row>
                    </Form>
                  </Card>
                </motion.div>
              </Col>
            </Row>
          </TabPane>
        )}

        {/* Data Display */}
        {sections.includes('data-display') && (
          <TabPane key="data-display" title="Data Display">
            <Row gutter={[16, 16]}>
              {/* Table */}
              <Col span={24}>
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.1 }}
                >
                  <Card title="Data Table">
                    <Table
                      columns={tableColumns}
                      data={tableData}
                      pagination={{ pageSize: 5 }}
                      stripe
                      hover
                    />
                  </Card>
                </motion.div>
              </Col>

              {/* Progress & Statistics */}
              <Col span={12}>
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.2 }}
                >
                  <Card title="Progress & Statistics">
                    <div className="space-y-4">
                      <div>
                        <Text className="block mb-2">Progress Bars:</Text>
                        <Progress percent={30} />
                        <Progress percent={70} status="active" />
                        <Progress percent={100} status="success" />
                        <Progress percent={50} status="error" />
                      </div>

                      <div>
                        <Text className="block mb-2">Circle Progress:</Text>
                        <Space>
                          <Progress type="circle" percent={75} />
                          <Progress type="circle" percent={100} status="success" />
                          <Progress type="circle" percent={30} status="error" />
                        </Space>
                      </div>

                      <div>
                        <Text className="block mb-2">Statistics:</Text>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Statistic title="Active Users" value={112893} />
                          </Col>
                          <Col span={12}>
                            <Statistic title="Revenue" value={112893} precision={2} prefix="$" />
                          </Col>
                        </Row>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </Col>

              {/* Timeline & Tree */}
              <Col span={12}>
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.3 }}
                >
                  <Card title="Timeline & Tree">
                    <Tabs size="small" type="card">
                      <TabPane key="timeline" title="Timeline">
                        <Timeline>
                          <TimelineItem>Create a services site</TimelineItem>
                          <TimelineItem>Solve initial network problems</TimelineItem>
                          <TimelineItem dotColor="red">
                            Sed ut perspiciatis unde omnis iste natus error
                          </TimelineItem>
                          <TimelineItem>Network problems being solved</TimelineItem>
                        </Timeline>
                      </TabPane>
                      <TabPane key="tree" title="Tree">
                        <Tree
                          data={treeData}
                          defaultExpandedKeys={['0-0', '0-1']}
                          defaultSelectedKeys={['0-0-0']}
                        />
                      </TabPane>
                    </Tabs>
                  </Card>
                </motion.div>
              </Col>
            </Row>
          </TabPane>
        )}

        {/* Feedback Components */}
        {sections.includes('feedback') && (
          <TabPane key="feedback" title="Feedback">
            <Row gutter={[16, 16]}>
              {/* Alerts */}
              <Col span={24}>
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.1 }}
                >
                  <Card title="Alerts">
                    <div className="space-y-4">
                      <Alert type="info" content="This is an info alert." />
                      <Alert type="success" content="This is a success alert." />
                      <Alert type="warning" content="This is a warning alert." />
                      <Alert type="error" content="This is an error alert." />
                      <Alert
                        type="info"
                        title="Info Alert"
                        content="This is an alert with title and close button."
                        closable
                      />
                    </div>
                  </Card>
                </motion.div>
              </Col>

              {/* Messages & Notifications */}
              <Col span={12}>
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.2 }}
                >
                  <Card title="Messages">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Button onClick={() => showMessage('info')}>Info Message</Button>
                      <Button onClick={() => showMessage('success')}>Success Message</Button>
                      <Button onClick={() => showMessage('warning')}>Warning Message</Button>
                      <Button onClick={() => showMessage('error')}>Error Message</Button>
                    </Space>
                  </Card>
                </motion.div>
              </Col>

              <Col span={12}>
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.3 }}
                >
                  <Card title="Notifications">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Button onClick={() => showNotification('info')}>Info Notification</Button>
                      <Button onClick={() => showNotification('success')}>
                        Success Notification
                      </Button>
                      <Button onClick={() => showNotification('warning')}>
                        Warning Notification
                      </Button>
                      <Button onClick={() => showNotification('error')}>Error Notification</Button>
                    </Space>
                  </Card>
                </motion.div>
              </Col>

              {/* Loading States */}
              <Col span={24}>
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.4 }}
                >
                  <Card title="Loading States">
                    <Row gutter={16}>
                      <Col span={8}>
                        <div className="text-center">
                          <Text className="block mb-2">Spin</Text>
                          <Spin />
                        </div>
                      </Col>
                      <Col span={8}>
                        <div className="text-center">
                          <Text className="block mb-2">Loading Button</Text>
                          <Button
                            type="primary"
                            loading={loading}
                            onClick={() => {
                              setLoading(true);
                              setTimeout(() => setLoading(false), 2000);
                            }}
                          >
                            {loading ? 'Loading...' : 'Click to Load'}
                          </Button>
                        </div>
                      </Col>
                      <Col span={8}>
                        <div>
                          <Text className="block mb-2">Skeleton</Text>
                          <Skeleton text={{ rows: 3 }} animation />
                        </div>
                      </Col>
                    </Row>
                  </Card>
                </motion.div>
              </Col>
            </Row>
          </TabPane>
        )}

        {/* Enhanced Katalyst Components */}
        {sections.includes('enhanced') && (
          <TabPane key="enhanced" title="Katalyst Enhanced">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.1 }}
                >
                  <Card title="Enhanced Components Demo">
                    <div className="space-y-6">
                      {/* Enhanced Cards */}
                      <div>
                        <Title heading={5} className="mb-4">
                          Enhanced Cards
                        </Title>
                        <Row gutter={16}>
                          <Col span={8}>
                            <KatalystCard variant="elevated" animation="hover">
                              <div className="p-4 text-center">
                                <IconHeart style={{ fontSize: 32, color: '#f53f3f' }} />
                                <Title heading={6} className="mt-2 mb-1">
                                  Hover Effect
                                </Title>
                                <Text type="secondary">Hover to see animation</Text>
                              </div>
                            </KatalystCard>
                          </Col>
                          <Col span={8}>
                            <KatalystCard variant="outlined" animation="float" gradient>
                              <div className="p-4 text-center">
                                <IconStar style={{ fontSize: 32, color: '#ffb400' }} />
                                <Title heading={6} className="mt-2 mb-1">
                                  Float Animation
                                </Title>
                                <Text type="secondary">Floating continuously</Text>
                              </div>
                            </KatalystCard>
                          </Col>
                          <Col span={8}>
                            <KatalystCard variant="filled">
                              <div className="p-4 text-center">
                                <IconSettings style={{ fontSize: 32, color: '#165DFF' }} />
                                <Title heading={6} className="mt-2 mb-1">
                                  Filled Variant
                                </Title>
                                <Text type="secondary">Different background</Text>
                              </div>
                            </KatalystCard>
                          </Col>
                        </Row>
                      </div>

                      {/* Interactive Demo */}
                      <div>
                        <Title heading={5} className="mb-4">
                          Interactive Demo
                        </Title>
                        <Space size="large">
                          <Button type="primary" onClick={() => setModalVisible(true)}>
                            Open Modal
                          </Button>
                          <Button type="secondary" onClick={() => setDrawerVisible(true)}>
                            Open Drawer
                          </Button>
                          <Tooltip content="This is a tooltip">
                            <Button type="outline">Hover for Tooltip</Button>
                          </Tooltip>
                          <Popover
                            title="Popover Title"
                            content={
                              <div>
                                <p>This is a popover content.</p>
                                <p>You can put any content here.</p>
                              </div>
                            }
                          >
                            <Button type="text">Click for Popover</Button>
                          </Popover>
                        </Space>
                      </div>

                      {/* Upload & File Components */}
                      <div>
                        <Title heading={5} className="mb-4">
                          File Upload
                        </Title>
                        <Upload
                          drag
                          multiple
                          action="/"
                          tip="Click or drag files to this area to upload"
                        />
                      </div>

                      {/* Steps */}
                      <div>
                        <Title heading={5} className="mb-4">
                          Steps
                        </Title>
                        <Steps current={1}>
                          <Step title="Step 1" description="This is description" />
                          <Step title="Step 2" description="This is description" />
                          <Step title="Step 3" description="This is description" />
                        </Steps>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </Col>
            </Row>
          </TabPane>
        )}
      </Tabs>

      {/* Modals and Drawers */}
      <Modal
        title="Sample Modal"
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => setModalVisible(false)}
      >
        <Paragraph>
          This is a sample modal content. You can put any content here including forms, tables, or
          other components.
        </Paragraph>
        <div className="my-4">
          <Input placeholder="Sample input in modal" />
        </div>
      </Modal>

      <Drawer
        title="Sample Drawer"
        visible={drawerVisible}
        onCancel={() => setDrawerVisible(false)}
        width={400}
      >
        <div className="space-y-4">
          <Paragraph>
            This is a sample drawer content. Drawers are useful for displaying additional
            information or forms without leaving the current page.
          </Paragraph>
          <Form layout="vertical">
            <Form.Item label="Name">
              <Input placeholder="Enter name" />
            </Form.Item>
            <Form.Item label="Description">
              <TextArea placeholder="Enter description" rows={4} />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary">Save</Button>
                <Button onClick={() => setDrawerVisible(false)}>Cancel</Button>
              </Space>
            </Form.Item>
          </Form>
        </div>
      </Drawer>
    </div>
  );
};

export default ArcoShowcase;
