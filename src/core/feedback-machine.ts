export type Phase = 'closed' | 'idle' | 'error' | 'capturing' | 'crumpling' | 'tossing' | 'settling';
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

export const initialState: FeedbackState = {
  phase: 'idle',
  fields: { name: '', comment: '' },
  errorMessage: null,
  tossSeed: 0,
  snapshotUrl: null,
};

export function isBlank(fields: FormFields): boolean {
  return false;
}

export function feedbackReducer(state: FeedbackState, event: FeedbackEvent): FeedbackState {
  return state;
}
