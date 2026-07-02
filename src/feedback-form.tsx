import { forwardRef } from 'react';
import './feedback-form.css';
import type { FormFields } from './core/feedback-machine';
import { CANCEL_BUTTON_LABEL, TOSS_BUTTON_LABEL } from './core/copy';

export interface FeedbackFormProps {
  fields: FormFields;
  errorMessage: string | null;
  shaking: boolean;
  onFieldChange(field: keyof FormFields, value: string): void;
  onCancel(): void;
  onToss(): void;
  onShakeEnd(): void;
  /** When true, the form is marked `inert` so it can't be focused or typed into (e.g. while a note is inspected behind the scrim). */
  inert?: boolean;
}

export const FeedbackForm = forwardRef<HTMLFormElement, FeedbackFormProps>(
  function FeedbackForm(
    {
      fields,
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
        <label>
          Name
          <input
            type="text"
            value={fields.name}
            onChange={(e) => onFieldChange('name', e.target.value)}
          />
        </label>
        <label>
          Comment
          <textarea
            rows={5}
            value={fields.comment}
            onChange={(e) => onFieldChange('comment', e.target.value)}
          />
        </label>
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
