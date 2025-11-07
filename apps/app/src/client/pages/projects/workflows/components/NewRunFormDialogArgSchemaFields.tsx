import { useState } from 'react';
import { Input } from '@/client/components/ui/input';
import { Label } from '@/client/components/ui/label';
import { Checkbox } from '@/client/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/client/components/ui/select';
import { Button } from '@/client/components/ui/button';
import { X, Plus } from 'lucide-react';

interface JSONSchema {
  type?: string;
  properties?: Record<string, JSONSchema>;
  enum?: readonly unknown[];
  items?: JSONSchema;
  required?: readonly string[];
  title?: string;
  description?: string;
  placeholder?: string;
}

interface NewRunFormDialogArgSchemaFieldsProps {
  argsSchema: JSONSchema;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  disabled?: boolean;
}

// Helper to get initial value based on schema type (prevents uncontrolled input warnings)
function getInitialValue(schema: JSONSchema): unknown {
  if (schema.type === 'string') return '';
  if (schema.type === 'number') return 0;
  if (schema.type === 'boolean') return false;
  if (schema.type === 'array') return [];
  if (schema.properties) return {};
  return '';
}

export function NewRunFormDialogArgSchemaFields({
  argsSchema,
  values,
  onChange,
  disabled = false,
}: NewRunFormDialogArgSchemaFieldsProps) {
  const properties = argsSchema.properties || {};
  const required = argsSchema.required || [];

  const handleFieldChange = (key: string, value: unknown) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className="space-y-6">
      {Object.entries(properties).map(([key, schema]) => (
        <SchemaField
          key={key}
          name={key}
          schema={schema}
          value={values[key]}
          onChange={(value) => handleFieldChange(key, value)}
          required={required.includes(key)}
          disabled={disabled}
          depth={0}
        />
      ))}
    </div>
  );
}

interface SchemaFieldProps {
  name: string;
  schema: JSONSchema;
  value: unknown;
  onChange: (value: unknown) => void;
  required?: boolean;
  disabled?: boolean;
  depth: number;
}

function SchemaField({
  name,
  schema,
  value,
  onChange,
  required = false,
  disabled = false,
  depth,
}: SchemaFieldProps) {
  const label = schema.title || name;
  const description = schema.description;
  const placeholder = schema.placeholder;

  // Max depth check
  if (depth > 3) {
    return null;
  }

  // Enum field
  if (schema.enum && schema.enum.length > 0) {
    return (
      <div className="space-y-2">
        <Label htmlFor={name}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Select
          value={value as string}
          onValueChange={onChange}
          disabled={disabled}
          required={required}
        >
          <SelectTrigger id={name}>
            <SelectValue placeholder={`Select ${label.toLowerCase()}...`} />
          </SelectTrigger>
          <SelectContent>
            {schema.enum.map((option) => (
              <SelectItem key={String(option)} value={String(option)}>
                {String(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    );
  }

  // Nested object field
  if (schema.properties) {
    // Initialize with empty object if undefined, ensuring controlled inputs
    const objValue = (value as Record<string, unknown> | undefined) || {};
    const objRequired = schema.required || [];

    return (
      <div className="space-y-2">
        <Label>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <div className="border rounded-md p-4 space-y-3">
          {Object.entries(schema.properties).map(([key, nestedSchema]) => {
            // Initialize nested values based on type to prevent uncontrolled->controlled warnings
            const nestedValue = objValue[key] ?? getInitialValue(nestedSchema);

            return (
              <SchemaField
                key={key}
                name={key}
                schema={nestedSchema}
                value={nestedValue}
                onChange={(newValue) => {
                  onChange({ ...objValue, [key]: newValue });
                }}
                required={objRequired.includes(key)}
                disabled={disabled}
                depth={depth + 1}
              />
            );
          })}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    );
  }

  // Array field (primitives only)
  if (schema.type === 'array' && schema.items) {
    return (
      <ArrayField
        name={name}
        schema={schema}
        label={label}
        value={value as unknown[]}
        onChange={onChange}
        required={required}
        disabled={disabled}
        description={description}
      />
    );
  }

  // Boolean field
  if (schema.type === 'boolean') {
    return (
      <div className="flex items-center space-x-2">
        <Checkbox
          id={name}
          checked={(value as boolean) ?? false}
          onCheckedChange={onChange}
          disabled={disabled}
          required={required}
        />
        <Label htmlFor={name} className="cursor-pointer">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground ml-2">{description}</p>
        )}
      </div>
    );
  }

  // Number field
  if (schema.type === 'number') {
    return (
      <div className="space-y-2">
        <Label htmlFor={name}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Input
          id={name}
          type="number"
          value={(value as number) ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
        />
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    );
  }

  // String field (default)
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Input
        id={name}
        type="text"
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
      />
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

interface ArrayFieldProps {
  name: string;
  schema: JSONSchema;
  label: string;
  value: unknown[];
  onChange: (value: unknown[]) => void;
  required?: boolean;
  disabled?: boolean;
  description?: string;
}

function ArrayField({
  name,
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  description,
}: ArrayFieldProps) {
  const [inputValue, setInputValue] = useState('');
  const items = value || [];

  const handleAdd = () => {
    if (!inputValue.trim()) return;
    onChange([...items, inputValue.trim()]);
    setInputValue('');
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      {/* Input + Add button */}
      <div className="flex gap-2">
        <Input
          id={name}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Add item..."
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleAdd}
          disabled={disabled || !inputValue.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Current items as chips */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-sm"
            >
              <span>{String(item)}</span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                disabled={disabled}
                className="hover:bg-secondary-foreground/10 rounded-sm p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
