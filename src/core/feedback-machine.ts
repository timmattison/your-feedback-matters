export type Phase =
  | 'closed'
  | 'idle'
  | 'error'
  | 'capturing'
  | 'crumpling'
  | 'tossing'
  | 'settling';
export interface FormFields {
  name: string;
  comment: string;
}
export interface FeedbackState {
  phase: Phase;
  fields: FormFields;
  errorMessage: string | null;
  tossSeed: number;
  snapshotUrl: string | null;
}
export type FeedbackEvent =
  | { type: 'OPEN' }
  | { type: 'CANCEL' }
  | { type: 'FIELD_CHANGED'; field: keyof FormFields; value: string }
  | { type: 'TOSS_REQUESTED'; seed: number }
  | { type: 'SHAKE_ENDED' }
  | { type: 'CAPTURED'; snapshotUrl: string | null }
  | { type: 'CRUMPLE_FINISHED' }
  | { type: 'BALL_RESTED' }
  | { type: 'SETTLE_FINISHED' };

import { BLANK_FEEDBACK_MESSAGE } from './copy';

// The app lands closed: a "Got feedback?" button, no form, and the basket
// slid off-screen. OPEN summons the form (and slides the basket in); CANCEL
// and a completed toss (SETTLE_FINISHED, via this same shape) return here.
export const initialState: FeedbackState = {
  phase: 'closed',
  fields: { name: '', comment: '' },
  errorMessage: null,
  tossSeed: 0,
  snapshotUrl: null,
};

export function isBlank(fields: FormFields): boolean {
  return fields.name.trim() === '' || fields.comment.trim() === '';
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
        ? { ...initialState, phase: 'closed' }
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
      return isBlank(state.fields)
        ? { ...state, phase: 'error', errorMessage: BLANK_FEEDBACK_MESSAGE }
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
      return state.phase === 'settling' ? { ...initialState } : state;
    default:
      return state;
  }
}
