export type InspectPhase = 'browsing' | 'opening' | 'open' | 'closing';
export interface InspectState {
  phase: InspectPhase;
  noteId: number | null;
}
export type InspectEvent =
  | { type: 'INSPECT'; noteId: number }
  | { type: 'OPEN_DONE' }
  | { type: 'DISMISS' }
  | { type: 'CLOSE_DONE' };

// Fishing a piled note back out of the basket to inspect it. While the
// feedback machine is 'idle', a tossed-and-settled note can be picked up:
// INSPECT lifts it (opening), OPEN_DONE finishes the lift (open), DISMISS
// starts putting it back (closing), and CLOSE_DONE drops it onto the pile
// again (browsing). This reducer runs only while the feedback machine is idle.
export const initialInspectState: InspectState = {
  phase: 'browsing',
  noteId: null,
};

export function inspectReducer(
  state: InspectState,
  event: InspectEvent,
): InspectState {
  switch (event.type) {
    case 'INSPECT':
      return state.phase === 'browsing'
        ? { phase: 'opening', noteId: event.noteId }
        : state;
    case 'OPEN_DONE':
      return state.phase === 'opening' ? { ...state, phase: 'open' } : state;
    case 'DISMISS':
      return state.phase === 'open' ? { ...state, phase: 'closing' } : state;
    case 'CLOSE_DONE':
      return state.phase === 'closing'
        ? { phase: 'browsing', noteId: null }
        : state;
    default:
      return state;
  }
}
