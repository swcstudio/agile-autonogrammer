import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  SaveOutlined,
  SendOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Divider,
  Form,
  type FormProps,
  Input,
  Radio,
  Rate,
  Row,
  Select,
  Slider,
  Space,
  Steps,
  Switch,
  TimePicker,
  Upload,
  message,
} from 'antd';
import type { FormInstance, FormItemProps } from 'antd';
import { AnimatePresence, motion } from 'framer-motion';
import type React from 'react';
import { useCallback, useState } from 'react';
import { cn } from '../../utils';
import { useComponentSize, useIsMobile } from '../design-system-store';
import { AnimatedButton } from './AnimatedButton';
import { GlowCard } from './GlowCard';

export interface ProFormField {
  name: string | string[];
  label?: React.ReactNode;
  type:
    | 'input'
    | 'password'
    | 'textarea'
    | 'number'
    | 'select'
    | 'multiselect'
    | 'date'
    | 'daterange'
    | 'time'
    | 'datetime'
    | 'switch'
    | 'checkbox'
    | 'radio'
    | 'rate'
    | 'slider'
    | 'upload'
    | 'custom';
  placeholder?: string;
  rules?: FormItemProps['rules'];
  dependencies?: FormItemProps['dependencies'];
  hidden?: boolean | ((values: any) => boolean);
  disabled?: boolean | ((values: any) => boolean);
  options?: Array<{ label: string; value: any; disabled?: boolean }>;
  fieldProps?: any;
  colProps?: any;
  component?: React.ComponentType<any>;
  tooltip?: string;
  extra?: React.ReactNode;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export interface ProFormSection {
  title?: React.ReactNode;
  description?: React.ReactNode;
  fields: ProFormField[];
  hidden?: boolean | ((values: any) => boolean);
  card?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export interface ProFormProps extends Omit<FormProps, 'fields'> {
  // Form structure
  fields?: ProFormField[];
  sections?: ProFormSection[];
  steps?: Array<{
    title: string;
    description?: string;
    sections?: ProFormSection[];
    fields?: ProFormField[];
  }>;

  // Layout
  variant?: 'default' | 'card' | 'modal' | 'drawer' | 'page';
  columns?: 1 | 2 | 3 | 4;
  gutter?: number;

  // Submission
  onSubmit?: (values: any) => void | Promise<void>;
  onSave?: (values: any) => void | Promise<void>;
  submitText?: string;
  saveText?: string;
  showReset?: boolean;
  showCancel?: boolean;
  onCancel?: () => void;

  // Validation
  validateTrigger?: 'onBlur' | 'onChange' | 'onSubmit';
  showErrorSummary?: boolean;

  // Mobile
  mobileColumns?: 1 | 2;
  stackOnMobile?: boolean;

  // Advanced
  debug?: boolean;
  autoSave?: boolean;
  autoSaveDelay?: number;
  confirmLeave?: boolean;

  // Style
  className?: string;
  cardProps?: any;
}

const fieldComponents = {
  input: Input,
  password: Input.Password,
  textarea: Input.TextArea,
  number: Input,
  select: Select,
  multiselect: Select,
  date: DatePicker,
  daterange: DatePicker.RangePicker,
  time: TimePicker,
  datetime: DatePicker,
  switch: Switch,
  checkbox: Checkbox,
  radio: Radio.Group,
  rate: Rate,
  slider: Slider,
  upload: Upload,
};

export const ProForm: React.FC<ProFormProps> = ({
  fields = [],
  sections = [],
  steps,

  variant = 'default',
  columns = 1,
  gutter = 24,

  onSubmit,
  onSave,
  submitText = 'Submit',
  saveText = 'Save',
  showReset = true,
  showCancel = false,
  onCancel,

  validateTrigger = 'onChange',
  showErrorSummary = false,

  mobileColumns = 1,
  stackOnMobile = true,

  debug = false,
  autoSave = false,
  autoSaveDelay = 3000,
  confirmLeave = false,

  className,
  cardProps,
  ...formProps
}) => {
  const [form] = Form.useForm(formProps.form);
  const isMobile = useIsMobile();
  const componentSize = useComponentSize();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<any[]>([]);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const actualColumns = isMobile && stackOnMobile ? mobileColumns : columns;

  // Handle form submission
  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    try {
      await onSubmit?.(values);
      message.success('Form submitted successfully!');

      if (!formProps.preserve) {
        form.resetFields();
        setTouchedFields(new Set());
      }
    } catch (error) {
      message.error('Failed to submit form');
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const values = form.getFieldsValue();
      await onSave?.(values);
      message.success('Form saved successfully!');
    } catch (error) {
      message.error('Failed to save form');
      console.error('Form save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save functionality
  const handleAutoSave = useCallback(
    debounce(async () => {
      if (autoSave && onSave && touchedFields.size > 0) {
        await handleSave();
      }
    }, autoSaveDelay),
    [autoSave, onSave, touchedFields]
  );

  // Handle field change
  const handleFieldChange = (changedFields: any[]) => {
    changedFields.forEach((field) => {
      if (field.name) {
        setTouchedFields((prev) => new Set(prev).add(field.name.join('.')));
      }
    });

    formProps.onFieldsChange?.(changedFields, form.getFieldsValue());
    handleAutoSave();
  };

  // Render a single field
  const renderField = (field: ProFormField, values: any) => {
    const isHidden = typeof field.hidden === 'function' ? field.hidden(values) : field.hidden;
    const isDisabled =
      typeof field.disabled === 'function' ? field.disabled(values) : field.disabled;

    if (isHidden) return null;

    const Component = field.component || fieldComponents[field.type];
    if (!Component) {
      console.warn(`Unknown field type: ${field.type}`);
      return null;
    }

    const fieldNode = (
      <Form.Item
        name={field.name}
        label={field.label}
        rules={field.rules}
        dependencies={field.dependencies}
        tooltip={field.tooltip}
        extra={field.extra}
        className={cn({
          'mb-6': isMobile,
        })}
      >
        <Component
          placeholder={field.placeholder}
          disabled={isDisabled}
          size={componentSize}
          prefix={field.prefix}
          suffix={field.suffix}
          {...field.fieldProps}
          {...(field.type === 'select' || field.type === 'multiselect'
            ? {
                options: field.options,
                mode: field.type === 'multiselect' ? 'multiple' : undefined,
                showSearch: true,
                filterOption: (input: string, option: any) =>
                  option?.label?.toLowerCase().includes(input.toLowerCase()),
              }
            : {})}
          {...(field.type === 'number'
            ? {
                type: 'number',
              }
            : {})}
          {...(field.type === 'upload'
            ? {
                beforeUpload: () => false,
                listType: 'picture-card',
              }
            : {})}
        />
      </Form.Item>
    );

    return (
      <Col
        key={Array.isArray(field.name) ? field.name.join('.') : field.name}
        span={24 / actualColumns}
        {...field.colProps}
      >
        {fieldNode}
      </Col>
    );
  };

  // Render fields in a section
  const renderSection = (section: ProFormSection, values: any, index: number) => {
    const isHidden = typeof section.hidden === 'function' ? section.hidden(values) : section.hidden;
    if (isHidden) return null;

    const content = (
      <>
        {section.title && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold">{section.title}</h3>
            {section.description && (
              <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
            )}
          </div>
        )}
        <Row gutter={[gutter, gutter]}>
          {section.fields.map((field) => renderField(field, values))}
        </Row>
      </>
    );

    if (section.card) {
      return (
        <GlowCard key={index} variant={isMobile ? 'glass' : 'glow'} className="mb-6" {...cardProps}>
          {content}
        </GlowCard>
      );
    }

    return (
      <div key={index} className="mb-8">
        {content}
      </div>
    );
  };

  // Render form content
  const renderFormContent = () => {
    const values = form.getFieldsValue();

    // Stepped form
    if (steps && steps.length > 0) {
      const currentStepData = steps[currentStep];

      return (
        <>
          <Steps
            current={currentStep}
            items={steps.map((step) => ({
              title: step.title,
              description: step.description,
            }))}
            className="mb-8"
            size={isMobile ? 'small' : 'default'}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStepData.sections?.map((section, idx) => renderSection(section, values, idx))}
              {currentStepData.fields && (
                <Row gutter={[gutter, gutter]}>
                  {currentStepData.fields.map((field) => renderField(field, values))}
                </Row>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-between mt-8">
            <AnimatedButton
              disabled={currentStep === 0}
              onClick={() => setCurrentStep((prev) => prev - 1)}
              icon={<ArrowLeftOutlined />}
            >
              Previous
            </AnimatedButton>

            {currentStep === steps.length - 1 ? (
              <AnimatedButton
                type="primary"
                htmlType="submit"
                loading={isSubmitting}
                icon={<SendOutlined />}
                variant="glow"
              >
                {submitText}
              </AnimatedButton>
            ) : (
              <AnimatedButton
                type="primary"
                onClick={() => setCurrentStep((prev) => prev + 1)}
                icon={<ArrowRightOutlined />}
              >
                Next
              </AnimatedButton>
            )}
          </div>
        </>
      );
    }

    // Sectioned form
    if (sections.length > 0) {
      return <>{sections.map((section, idx) => renderSection(section, values, idx))}</>;
    }

    // Simple fields form
    return <Row gutter={[gutter, gutter]}>{fields.map((field) => renderField(field, values))}</Row>;
  };

  // Form wrapper based on variant
  const formContent = (
    <Form
      {...formProps}
      form={form}
      layout={isMobile ? 'vertical' : formProps.layout}
      size={componentSize}
      validateTrigger={validateTrigger}
      onFinish={handleSubmit}
      onFieldsChange={handleFieldChange}
      onFinishFailed={({ errorFields }) => setErrors(errorFields)}
      className={cn('katalyst-pro-form', className)}
    >
      {renderFormContent()}

      {/* Error summary */}
      {showErrorSummary && errors.length > 0 && (
        <Card className="mb-4 border-destructive" size="small">
          <h4 className="text-destructive font-semibold mb-2">Please fix the following errors:</h4>
          <ul className="list-disc list-inside">
            {errors.map((error, idx) => (
              <li key={idx} className="text-sm text-destructive">
                {error.errors[0]}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Form actions */}
      {!steps && (
        <div className="flex flex-wrap gap-3 mt-8">
          <AnimatedButton
            type="primary"
            htmlType="submit"
            loading={isSubmitting}
            icon={<SendOutlined />}
            variant="glow"
            size={isMobile ? 'large' : 'middle'}
            block={isMobile}
          >
            {submitText}
          </AnimatedButton>

          {onSave && (
            <AnimatedButton
              loading={isSaving}
              onClick={handleSave}
              icon={<SaveOutlined />}
              variant="shimmer"
              size={isMobile ? 'large' : 'middle'}
              block={isMobile}
            >
              {saveText}
            </AnimatedButton>
          )}

          {showReset && (
            <AnimatedButton
              onClick={() => {
                form.resetFields();
                setTouchedFields(new Set());
              }}
              icon={<ReloadOutlined />}
              size={isMobile ? 'large' : 'middle'}
              block={isMobile}
            >
              Reset
            </AnimatedButton>
          )}

          {showCancel && (
            <AnimatedButton
              onClick={onCancel}
              size={isMobile ? 'large' : 'middle'}
              block={isMobile}
            >
              Cancel
            </AnimatedButton>
          )}
        </div>
      )}

      {/* Debug panel */}
      {debug && (
        <Card className="mt-8 bg-muted" size="small">
          <h4 className="font-semibold mb-2">Debug Info</h4>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(form.getFieldsValue(), null, 2)}
          </pre>
        </Card>
      )}
    </Form>
  );

  if (variant === 'card') {
    return (
      <GlowCard variant={isMobile ? 'glass' : 'glow'} {...cardProps}>
        {formContent}
      </GlowCard>
    );
  }

  return formContent;
};

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
