import {
  createInitialState,
  feedbackReducer,
  initialState,
  isBlank,
  type FeedbackState,
} from './feedback-machine';
import { BLANK_FEEDBACK_MESSAGE } from './copy';

// An open, filled-in form — the starting point for the toss/cancel paths.
// (initialState is now 'closed', so the phase must be set explicitly.)
const filled: FeedbackState = {
  ...initialState,
  phase: 'idle',
  fields: { name: 'Tim', comment: 'Needs more cowbell' },
};

// An open, still-blank form — the starting point for the blank-toss error path.
const blankOpen: FeedbackState = { ...initialState, phase: 'idle' };

test('starts closed on the "Got feedback?" landing, with empty fields', () => {
  expect(initialState.phase).toBe('closed');
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
  const next = feedbackReducer(blankOpen, {
    type: 'TOSS_REQUESTED',
    seed: 5,
  });
  expect(next.phase).toBe('error');
  expect(next.errorMessage).toBe(BLANK_FEEDBACK_MESSAGE);
});

test('SHAKE_ENDED returns to idle but keeps the message until an edit', () => {
  const errored = feedbackReducer(blankOpen, {
    type: 'TOSS_REQUESTED',
    seed: 5,
  });
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

test('filled toss walks capturing → crumpling → tossing → settling → closed landing', () => {
  let s = feedbackReducer(filled, { type: 'TOSS_REQUESTED', seed: 99 });
  expect(s.phase).toBe('capturing');
  expect(s.tossSeed).toBe(99);
  s = feedbackReducer(s, {
    type: 'CAPTURED',
    snapshotUrl: 'data:image/png;base64,x',
  });
  expect(s.phase).toBe('crumpling');
  expect(s.snapshotUrl).toBe('data:image/png;base64,x');
  s = feedbackReducer(s, { type: 'CRUMPLE_FINISHED' });
  expect(s.phase).toBe('tossing');
  s = feedbackReducer(s, { type: 'BALL_RESTED' });
  expect(s.phase).toBe('settling');
  s = feedbackReducer(s, { type: 'SETTLE_FINISHED' });
  expect(s.phase).toBe('closed');
  expect(s.fields).toEqual({ name: '', comment: '' });
  expect(s.snapshotUrl).toBeNull();
});

test('SETTLE_FINISHED returns to the closed landing, not a fresh open form', () => {
  const settling: FeedbackState = { ...filled, phase: 'settling' };
  const next = feedbackReducer(settling, { type: 'SETTLE_FINISHED' });
  expect(next.phase).toBe('closed');
  expect(next.fields).toEqual({ name: '', comment: '' });
  expect(next.snapshotUrl).toBeNull();
});

test('createInitialState seeds empty values and the required set from field configs', () => {
  const custom = createInitialState([
    { name: 'email', label: 'Email' },
    { name: 'msg', label: 'Message', type: 'textarea', required: false },
  ]);
  expect(custom.phase).toBe('closed');
  expect(custom.fields).toEqual({ email: '', msg: '' });
  // Only fields whose `required` is not explicitly false are required.
  expect(custom.requiredFields).toEqual(['email']);
  expect(custom.errorMessage).toBeNull();
  expect(custom.tossSeed).toBe(0);
  expect(custom.snapshotUrl).toBeNull();
});

test('isBlank only blocks on blank REQUIRED fields, ignoring optional ones', () => {
  const values = { email: 'a@b.com', msg: '' };
  // msg blank is fine while it is not required...
  expect(isBlank(values, ['email'])).toBe(false);
  // ...but blocks once it is required.
  expect(isBlank(values, ['email', 'msg'])).toBe(true);
  // A blank required field always blocks.
  expect(isBlank({ email: '   ', msg: 'hi' }, ['email'])).toBe(true);
});

test('CANCEL preserves a custom field set, clearing values but keeping the keys', () => {
  const custom = createInitialState([
    { name: 'email', label: 'Email' },
    { name: 'msg', label: 'Message', type: 'textarea' },
  ]);
  const filledCustom: FeedbackState = {
    ...custom,
    phase: 'idle',
    fields: { email: 'a@b.com', msg: 'hello' },
  };
  const next = feedbackReducer(filledCustom, { type: 'CANCEL' });
  expect(next.phase).toBe('closed');
  expect(next.fields).toEqual({ email: '', msg: '' });
  expect(next.requiredFields).toEqual(['email', 'msg']);
});

test('SETTLE_FINISHED preserves a custom field set, clearing values but keeping the keys', () => {
  const custom = createInitialState([
    { name: 'email', label: 'Email' },
    { name: 'msg', label: 'Message', type: 'textarea' },
  ]);
  const settlingCustom: FeedbackState = {
    ...custom,
    phase: 'settling',
    fields: { email: 'a@b.com', msg: 'hello' },
  };
  const next = feedbackReducer(settlingCustom, { type: 'SETTLE_FINISHED' });
  expect(next.phase).toBe('closed');
  expect(next.fields).toEqual({ email: '', msg: '' });
  expect(next.requiredFields).toEqual(['email', 'msg']);
});

test('events in the wrong phase are ignored', () => {
  expect(feedbackReducer(initialState, { type: 'CRUMPLE_FINISHED' })).toBe(
    initialState,
  );
  // OPEN only means something while closed; from an open form it's a no-op.
  const idle: FeedbackState = { ...initialState, phase: 'idle' };
  expect(feedbackReducer(idle, { type: 'OPEN' })).toBe(idle);
});
