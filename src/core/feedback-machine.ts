export type Phase =
  | 'closed'
  | 'idle'
  | 'error'
  | 'capturing'
  | 'crumpling'
  | 'tossing'
  | 'settling';
export type FormFields = Record<string, string>;
export interface FeedbackState {
  phase: Phase;
  fields: FormFields;
  /** Names of the fields that must be non-blank for a toss to be accepted. */
  requiredFields: readonly string[];
  errorMessage: string | null;
  tossSeed: number;
  snapshotUrl: string | null;
}
export type FeedbackEvent =
  | { type: 'OPEN' }
  | { type: 'CANCEL' }
  | { type: 'FIELD_CHANGED'; field: string; value: string }
  | { type: 'TOSS_REQUESTED'; seed: number; blankMessage?: string }
  | { type: 'SHAKE_ENDED' }
  | { type: 'CAPTURED'; snapshotUrl: string | null }
  | { type: 'CRUMPLE_FINISHED' }
  | { type: 'BALL_RESTED' }
  | { type: 'SETTLE_FINISHED' };

import { BLANK_FEEDBACK_MESSAGE } from './copy';
import { DEFAULT_FIELDS, type FieldConfig } from './fields';

// Builds the closed-landing state for a given field configuration: every field
// starts empty, and a field is required unless its config opts out
// (`required: false`). The app lands closed — a "Got feedback?" button, no
// form, and the basket slid off-screen. OPEN summons the form (and slides the
// basket in); CANCEL and a completed toss (SETTLE_FINISHED) return here.
export function createInitialState(
  fieldConfigs: readonly FieldConfig[],
): FeedbackState {
  const fields: FormFields = {};
  const requiredFields: string[] = [];
  for (const config of fieldConfigs) {
    fields[config.name] = '';
    if (config.required ?? true) requiredFields.push(config.name);
  }
  return {
    phase: 'closed',
    fields,
    requiredFields,
    errorMessage: null,
    tossSeed: 0,
    snapshotUrl: null,
  };
}

export const initialState: FeedbackState = createInitialState(DEFAULT_FIELDS);

// Resets to the closed landing while preserving the CURRENT field set: values
// are cleared but the keys (and the required set) are kept, so a consumer's
// custom fields survive a cancel or a completed toss.
function resetState(state: FeedbackState): FeedbackState {
  const fields: FormFields = {};
  for (const name of Object.keys(state.fields)) fields[name] = '';
  return {
    phase: 'closed',
    fields,
    requiredFields: state.requiredFields,
    errorMessage: null,
    tossSeed: 0,
    snapshotUrl: null,
  };
}

// True when ANY required field is blank after trimming. When no explicit
// required set is given, every present field is treated as required (keeps the
// original 1-arg callers behaving identically).
export function isBlank(
  fields: FormFields,
  requiredFields: readonly string[] = Object.keys(fields),
): boolean {
  return requiredFields.some((name) => (fields[name] ?? '').trim() === '');
}

export function feedbackReducer(
  state: FeedbackState,
  event: FeedbackEvent,
): FeedbackState {
  switch (event.type) {
    case 'OPEN':
      return state.phase === 'closed' ? { ...state, phase: 'idle' } : state;
    case 'CANCEL':
      return state.phase === 'idle' || state.phase === 'error'
        ? resetState(state)
        : state;
    case 'FIELD_CHANGED':
      return state.phase === 'idle' || state.phase === 'error'
        ? {
            ...state,
            fields: { ...state.fields, [event.field]: event.value },
            errorMessage: null,
          }
        : state;
    case 'TOSS_REQUESTED':
      if (state.phase !== 'idle' && state.phase !== 'error') return state;
      return isBlank(state.fields, state.requiredFields)
        ? {
            ...state,
            phase: 'error',
            errorMessage: event.blankMessage ?? BLANK_FEEDBACK_MESSAGE,
          }
        : {
            ...state,
            phase: 'capturing',
            tossSeed: event.seed,
            errorMessage: null,
          };
    case 'SHAKE_ENDED':
      return state.phase === 'error' ? { ...state, phase: 'idle' } : state;
    case 'CAPTURED':
      return state.phase === 'capturing'
        ? { ...state, phase: 'crumpling', snapshotUrl: event.snapshotUrl }
        : state;
    case 'CRUMPLE_FINISHED':
      return state.phase === 'crumpling'
        ? { ...state, phase: 'tossing' }
        : state;
    case 'BALL_RESTED':
      return state.phase === 'tossing'
        ? { ...state, phase: 'settling' }
        : state;
    case 'SETTLE_FINISHED':
      return state.phase === 'settling' ? resetState(state) : state;
    default:
      return state;
  }
}
