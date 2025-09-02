import { type DeepKeys, type DeepValue, FieldApi, FormApi, useForm } from '@tanstack/react-form';
import React from 'react';
import { cn } from '../../../utils/cn';

export interface FieldArrayProps<TFormData, TName extends DeepKeys<TFormData>> {
  name: TName;
  children: (fieldArray: {
    fields: Array<{
      key: string;
      name: string;
      index: number;
    }>;
    append: (value: any) => void;
    prepend: (value: any) => void;
    remove: (index: number) => void;
    insert: (index: number, value: any) => void;
    move: (from: number, to: number) => void;
    replace: (index: number, value: any) => void;
    update: (index: number, updates: Partial<any>) => void;
    clear: () => void;
  }) => React.ReactNode;
  defaultValue?: any;
}

export function FieldArray<TFormData, TName extends DeepKeys<TFormData>>({
  name,
  children,
  defaultValue,
}: FieldArrayProps<TFormData, TName>) {
  const form = useForm<TFormData>();
  const [fields, setFields] = React.useState<
    Array<{
      key: string;
      name: string;
      index: number;
    }>
  >([]);

  const arrayPath = name as string;

  // Get current array value
  const getValue = () => {
    const formValues = form.state.values;
    const pathParts = arrayPath.split('.');
    let current: any = formValues;

    for (const part of pathParts) {
      current = current?.[part];
    }

    return Array.isArray(current) ? current : [];
  };

  // Set array value
  const setValue = (newArray: any[]) => {
    form.setFieldValue(name, newArray as DeepValue<TFormData, TName>);
  };

  // Update fields when array changes
  React.useEffect(() => {
    const array = getValue();
    setFields(
      array.map((_, index) => ({
        key: `${arrayPath}-${index}-${Date.now()}`,
        name: `${arrayPath}[${index}]`,
        index,
      }))
    );
  }, [form.state.values]);

  const fieldArray = {
    fields,

    append: (value: any) => {
      const current = getValue();
      setValue([...current, value]);
    },

    prepend: (value: any) => {
      const current = getValue();
      setValue([value, ...current]);
    },

    remove: (index: number) => {
      const current = getValue();
      setValue(current.filter((_, i) => i !== index));
    },

    insert: (index: number, value: any) => {
      const current = getValue();
      const newArray = [...current];
      newArray.splice(index, 0, value);
      setValue(newArray);
    },

    move: (from: number, to: number) => {
      const current = getValue();
      const newArray = [...current];
      const [item] = newArray.splice(from, 1);
      newArray.splice(to, 0, item);
      setValue(newArray);
    },

    replace: (index: number, value: any) => {
      const current = getValue();
      const newArray = [...current];
      newArray[index] = value;
      setValue(newArray);
    },

    update: (index: number, updates: Partial<any>) => {
      const current = getValue();
      const newArray = [...current];
      newArray[index] = { ...newArray[index], ...updates };
      setValue(newArray);
    },

    clear: () => {
      setValue([]);
    },
  };

  return <>{children(fieldArray)}</>;
}

// Dynamic list component with drag and drop
export interface DynamicListProps<T> {
  items: T[];
  onItemsChange: (items: T[]) => void;
  renderItem: (
    item: T,
    index: number,
    controls: {
      onRemove: () => void;
      onMoveUp: () => void;
      onMoveDown: () => void;
      onEdit: (updates: Partial<T>) => void;
      canMoveUp: boolean;
      canMoveDown: boolean;
    }
  ) => React.ReactNode;
  onAdd: () => T;
  emptyMessage?: string;
  className?: string;
  itemClassName?: string;
  addButtonText?: string;
  maxItems?: number;
  minItems?: number;
  sortable?: boolean;
}

export function DynamicList<T>({
  items,
  onItemsChange,
  renderItem,
  onAdd,
  emptyMessage = 'No items yet',
  className,
  itemClassName,
  addButtonText = 'Add Item',
  maxItems,
  minItems = 0,
  sortable = false,
}: DynamicListProps<T>) {
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);

  const handleAdd = () => {
    if (!maxItems || items.length < maxItems) {
      onItemsChange([...items, onAdd()]);
    }
  };

  const handleRemove = (index: number) => {
    if (items.length > minItems) {
      onItemsChange(items.filter((_, i) => i !== index));
    }
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      const newItems = [...items];
      [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
      onItemsChange(newItems);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < items.length - 1) {
      const newItems = [...items];
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
      onItemsChange(newItems);
    }
  };

  const handleEdit = (index: number, updates: Partial<T>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    onItemsChange(newItems);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newItems = [...items];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(dropIndex, 0, draggedItem);

    onItemsChange(newItems);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {items.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={index}
              draggable={sortable}
              onDragStart={(e) => sortable && handleDragStart(e, index)}
              onDragOver={sortable ? handleDragOver : undefined}
              onDrop={(e) => sortable && handleDrop(e, index)}
              onDragEnd={sortable ? handleDragEnd : undefined}
              className={cn(
                'relative',
                sortable && 'cursor-move',
                draggedIndex === index && 'opacity-50',
                itemClassName
              )}
            >
              {renderItem(item, index, {
                onRemove: () => handleRemove(index),
                onMoveUp: () => handleMoveUp(index),
                onMoveDown: () => handleMoveDown(index),
                onEdit: (updates) => handleEdit(index, updates),
                canMoveUp: index > 0,
                canMoveDown: index < items.length - 1,
              })}
            </div>
          ))}
        </div>
      )}

      {(!maxItems || items.length < maxItems) && (
        <button
          type="button"
          onClick={handleAdd}
          className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
        >
          {addButtonText}
        </button>
      )}
    </div>
  );
}

// Repeater field component
export interface RepeaterFieldProps<T> {
  name: string;
  label?: string;
  fields: Array<{
    name: keyof T;
    label: string;
    type: 'text' | 'number' | 'select' | 'checkbox';
    options?: { value: string; label: string }[];
    placeholder?: string;
    required?: boolean;
  }>;
  defaultItem: () => T;
  minItems?: number;
  maxItems?: number;
  className?: string;
}

export function RepeaterField<T extends Record<string, any>>({
  name,
  label,
  fields,
  defaultItem,
  minItems = 0,
  maxItems,
  className,
}: RepeaterFieldProps<T>) {
  return (
    <div className={cn('space-y-4', className)}>
      {label && <label className="block text-sm font-medium">{label}</label>}

      <FieldArray name={name as any}>
        {({ fields: arrayFields, append, remove }) => (
          <div className="space-y-4">
            {arrayFields.map((field, index) => (
              <div key={field.key} className="p-4 border rounded-md space-y-4">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium">Item {index + 1}</h4>
                  {arrayFields.length > minItems && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {fields.map((fieldConfig) => (
                    <div key={fieldConfig.name as string}>
                      <label className="block text-sm font-medium mb-1">
                        {fieldConfig.label}
                        {fieldConfig.required && <span className="text-destructive ml-0.5">*</span>}
                      </label>

                      {fieldConfig.type === 'text' && (
                        <input
                          type="text"
                          name={`${field.name}.${fieldConfig.name as string}`}
                          placeholder={fieldConfig.placeholder}
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      )}

                      {fieldConfig.type === 'number' && (
                        <input
                          type="number"
                          name={`${field.name}.${fieldConfig.name as string}`}
                          placeholder={fieldConfig.placeholder}
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      )}

                      {fieldConfig.type === 'select' && fieldConfig.options && (
                        <select
                          name={`${field.name}.${fieldConfig.name as string}`}
                          className="w-full px-3 py-2 border rounded-md"
                        >
                          <option value="">{fieldConfig.placeholder || 'Select...'}</option>
                          {fieldConfig.options.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )}

                      {fieldConfig.type === 'checkbox' && (
                        <input
                          type="checkbox"
                          name={`${field.name}.${fieldConfig.name as string}`}
                          className="rounded border-gray-300"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {(!maxItems || arrayFields.length < maxItems) && (
              <button
                type="button"
                onClick={() => append(defaultItem())}
                className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-700"
              >
                Add {label || 'Item'}
              </button>
            )}
          </div>
        )}
      </FieldArray>
    </div>
  );
}
