export type FieldType = 'text' | 'textarea';

export interface FieldConfig {
  /** Key into the collected values and the FIELD_CHANGED event. Must be unique. */
  name: string;
  /** Visible + accessible label for the field. */
  label: string;
  /** Control type. Defaults to 'text'. */
  type?: FieldType;
  /** Rows for a 'textarea' control. Defaults to 5. Ignored for 'text'. */
  rows?: number;
  /** Whether the field must be non-blank for a toss to be accepted. Defaults to true. */
  required?: boolean;
}

export const DEFAULT_FIELDS: readonly FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text' },
  { name: 'comment', label: 'Comment', type: 'textarea', rows: 5 },
];
