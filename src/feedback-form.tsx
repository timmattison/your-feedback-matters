import { forwardRef } from 'react';
import './feedback-form.css';
import type { FormFields } from './core/feedback-machine';
import type { FieldConfig } from './core/fields';
import { CANCEL_BUTTON_LABEL, TOSS_BUTTON_LABEL } from './core/copy';

const DEFAULT_TEXTAREA_ROWS = 5;

export interface FeedbackFormProps {
  /** What fields to render, in order. */
  fieldConfigs: readonly FieldConfig[];
  /** Current value for each field, keyed by {@link FieldConfig.name}. */
  values: FormFields;
  errorMessage: string | null;
  shaking: boolean;
  onFieldChange(field: string, value: string): void;
  onCancel(): void;
  onToss(): void;
  onShakeEnd(): void;
  /** When true, the form is marked `inert` so it can't be focused or typed into (e.g. while a note is inspected behind the scrim). */
  inert?: boolean;
}

export const FeedbackForm = forwardRef<HTMLFormElement, FeedbackFormProps>(
  function FeedbackForm(
    {
      fieldConfigs,
      values,
      errorMessage,
      shaking,
      onFieldChange,
      onCancel,
      onToss,
      onShakeEnd,
      inert,
    },
    ref,
  ) {
    return (
      <form
        ref={ref}
        aria-label="Feedback form"
        className={`feedback-form${shaking ? ' shake' : ''}`}
        inert={inert}
        onAnimationEnd={onShakeEnd}
        onSubmit={(e) => e.preventDefault()}
      >
        <h1>Your Feedback Matters</h1>
        {fieldConfigs.map((config) => (
          <label key={config.name}>
            {config.label}
            {config.type === 'textarea' ? (
              <textarea
                rows={config.rows ?? DEFAULT_TEXTAREA_ROWS}
                value={values[config.name] ?? ''}
                onChange={(e) => onFieldChange(config.name, e.target.value)}
              />
            ) : (
              <input
                type="text"
                value={values[config.name] ?? ''}
                onChange={(e) => onFieldChange(config.name, e.target.value)}
              />
            )}
          </label>
        ))}
        {errorMessage !== null && (
          <p role="alert" className="blank-scolding">
            {errorMessage}
          </p>
        )}
        <div className="actions">
          <button type="button" onClick={onCancel}>
            {CANCEL_BUTTON_LABEL}
          </button>
          <button type="button" className="toss" onClick={onToss}>
            {TOSS_BUTTON_LABEL}
          </button>
        </div>
      </form>
    );
  },
);
