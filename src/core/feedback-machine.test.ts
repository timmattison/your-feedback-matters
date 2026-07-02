import {
  feedbackReducer,
  initialState,
  isBlank,
  type FeedbackState,
} from './feedback-machine';
import { BLANK_FEEDBACK_MESSAGE } from './copy';

const filled: FeedbackState = {
  ...initialState,
  fields: { name: 'Tim', comment: 'Needs more cowbell' },
};

test('starts idle with empty fields', () => {
  expect(initialState.phase).toBe('idle');
  expect(initialState.fields).toEqual({ name: '', comment: '' });
});

test('isBlank is true when either trimmed field is empty', () => {
  expect(isBlank({ name: '  ', comment: '\n' })).toBe(true);
  expect(isBlank({ name: 'Tim', comment: '' })).toBe(true);
  expect(isBlank({ name: '', comment: 'hi' })).toBe(true);
  expect(isBlank({ name: 'Tim', comment: 'hi' })).toBe(false);
});

test('CANCEL closes and clears fields', () => {
  const next = feedbackReducer(filled, { type: 'CANCEL' });
  expect(next.phase).toBe('closed');
  expect(next.fields).toEqual({ name: '', comment: '' });
});

test('OPEN reopens a closed form', () => {
  const closed = feedbackReducer(filled, { type: 'CANCEL' });
  expect(feedbackReducer(closed, { type: 'OPEN' }).phase).toBe('idle');
});

test('blank toss goes to error with the scolding message', () => {
  const next = feedbackReducer(initialState, { type: 'TOSS_REQUESTED', seed: 5 });
  expect(next.phase).toBe('error');
  expect(next.errorMessage).toBe(BLANK_FEEDBACK_MESSAGE);
});

test('SHAKE_ENDED returns to idle but keeps the message until an edit', () => {
  const errored = feedbackReducer(initialState, { type: 'TOSS_REQUESTED', seed: 5 });
  const calmed = feedbackReducer(errored, { type: 'SHAKE_ENDED' });
  expect(calmed.phase).toBe('idle');
  expect(calmed.errorMessage).toBe(BLANK_FEEDBACK_MESSAGE);
  const edited = feedbackReducer(calmed, {
    type: 'FIELD_CHANGED',
    field: 'comment',
    value: 'x',
  });
  expect(edited.errorMessage).toBeNull();
  expect(edited.fields.comment).toBe('x');
});

test('filled toss walks capturing → crumpling → tossing → settling → fresh idle', () => {
  let s = feedbackReducer(filled, { type: 'TOSS_REQUESTED', seed: 99 });
  expect(s.phase).toBe('capturing');
  expect(s.tossSeed).toBe(99);
  s = feedbackReducer(s, { type: 'CAPTURED', snapshotUrl: 'data:image/png;base64,x' });
  expect(s.phase).toBe('crumpling');
  expect(s.snapshotUrl).toBe('data:image/png;base64,x');
  s = feedbackReducer(s, { type: 'CRUMPLE_FINISHED' });
  expect(s.phase).toBe('tossing');
  s = feedbackReducer(s, { type: 'BALL_RESTED' });
  expect(s.phase).toBe('settling');
  s = feedbackReducer(s, { type: 'SETTLE_FINISHED' });
  expect(s.phase).toBe('idle');
  expect(s.fields).toEqual({ name: '', comment: '' });
  expect(s.snapshotUrl).toBeNull();
});

test('events in the wrong phase are ignored', () => {
  expect(feedbackReducer(initialState, { type: 'CRUMPLE_FINISHED' })).toBe(initialState);
  expect(feedbackReducer(initialState, { type: 'OPEN' })).toBe(initialState);
});
