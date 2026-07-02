import {
  inspectReducer,
  initialInspectState,
  type InspectState,
} from './inspect-machine';

// The four resting points of the fish-it-back-out interaction.
const opening: InspectState = { phase: 'opening', noteId: 7 };
const open: InspectState = { phase: 'open', noteId: 7 };
const closing: InspectState = { phase: 'closing', noteId: 7 };

test('starts browsing the pile with no note picked up', () => {
  expect(initialInspectState.phase).toBe('browsing');
  expect(initialInspectState.noteId).toBeNull();
});

test('INSPECT lifts a note out of the pile while browsing', () => {
  const next = inspectReducer(initialInspectState, {
    type: 'INSPECT',
    noteId: 42,
  });
  expect(next.phase).toBe('opening');
  expect(next.noteId).toBe(42);
});

test('INSPECT is ignored once a note is already being handled', () => {
  expect(inspectReducer(opening, { type: 'INSPECT', noteId: 99 })).toBe(
    opening,
  );
  expect(inspectReducer(open, { type: 'INSPECT', noteId: 99 })).toBe(open);
  expect(inspectReducer(closing, { type: 'INSPECT', noteId: 99 })).toBe(
    closing,
  );
});

test('OPEN_DONE only finishes the lift from opening', () => {
  const next = inspectReducer(opening, { type: 'OPEN_DONE' });
  expect(next.phase).toBe('open');
  expect(next.noteId).toBe(7);
  expect(inspectReducer(open, { type: 'OPEN_DONE' })).toBe(open);
  expect(inspectReducer(closing, { type: 'OPEN_DONE' })).toBe(closing);
  expect(inspectReducer(initialInspectState, { type: 'OPEN_DONE' })).toBe(
    initialInspectState,
  );
});

test('DISMISS only starts closing from open, retaining the note', () => {
  const next = inspectReducer(open, { type: 'DISMISS' });
  expect(next.phase).toBe('closing');
  expect(next.noteId).toBe(7);
  expect(inspectReducer(opening, { type: 'DISMISS' })).toBe(opening);
  expect(inspectReducer(closing, { type: 'DISMISS' })).toBe(closing);
  expect(inspectReducer(initialInspectState, { type: 'DISMISS' })).toBe(
    initialInspectState,
  );
});

test('CLOSE_DONE only returns to browsing from closing, clearing the note', () => {
  const next = inspectReducer(closing, { type: 'CLOSE_DONE' });
  expect(next.phase).toBe('browsing');
  expect(next.noteId).toBeNull();
  expect(inspectReducer(opening, { type: 'CLOSE_DONE' })).toBe(opening);
  expect(inspectReducer(open, { type: 'CLOSE_DONE' })).toBe(open);
  expect(inspectReducer(initialInspectState, { type: 'CLOSE_DONE' })).toBe(
    initialInspectState,
  );
});

test('events in the wrong phase are ignored', () => {
  expect(inspectReducer(initialInspectState, { type: 'OPEN_DONE' })).toBe(
    initialInspectState,
  );
  expect(inspectReducer(opening, { type: 'INSPECT', noteId: 1 })).toBe(opening);
});

test('fishing a note back out walks browsing → opening → open → closing → browsing', () => {
  let s = inspectReducer(initialInspectState, { type: 'INSPECT', noteId: 3 });
  expect(s.phase).toBe('opening');
  expect(s.noteId).toBe(3);
  s = inspectReducer(s, { type: 'OPEN_DONE' });
  expect(s.phase).toBe('open');
  expect(s.noteId).toBe(3);
  s = inspectReducer(s, { type: 'DISMISS' });
  expect(s.phase).toBe('closing');
  expect(s.noteId).toBe(3);
  s = inspectReducer(s, { type: 'CLOSE_DONE' });
  expect(s.phase).toBe('browsing');
  expect(s.noteId).toBeNull();
});
