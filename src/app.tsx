import { useEffect, useReducer, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import './app.css';
import { FeedbackForm } from './feedback-form';
import { CrumpleScene } from './scene/crumple-scene';
import { feedbackReducer, initialState } from './core/feedback-machine';
import { POWERED_BY_TEXT, REOPEN_BUTTON_LABEL, REPO_URL } from './core/copy';

export function App() {
  const [state, dispatch] = useReducer(feedbackReducer, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [formRect, setFormRect] = useState<DOMRect | null>(null);

  const formVisible =
    state.phase === 'idle' ||
    state.phase === 'error' ||
    state.phase === 'capturing';

  useEffect(() => {
    if (state.phase !== 'capturing') return;
    const node = formRef.current;
    if (node === null) {
      dispatch({ type: 'CAPTURED', snapshotUrl: null });
      return;
    }
    setFormRect(node.getBoundingClientRect());
    let cancelled = false;
    toPng(node)
      .then((url) => {
        if (!cancelled) dispatch({ type: 'CAPTURED', snapshotUrl: url });
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: 'CAPTURED', snapshotUrl: null });
      });
    return () => {
      cancelled = true;
    };
  }, [state.phase]);

  return (
    <main className="page">
      {formVisible && (
        <FeedbackForm
          ref={formRef}
          fields={state.fields}
          errorMessage={state.errorMessage}
          shaking={state.phase === 'error'}
          onFieldChange={(field, value) =>
            dispatch({ type: 'FIELD_CHANGED', field, value })
          }
          onCancel={() => dispatch({ type: 'CANCEL' })}
          onToss={() =>
            dispatch({
              type: 'TOSS_REQUESTED',
              seed: Math.floor(Math.random() * 2 ** 32),
            })
          }
          onShakeEnd={() => dispatch({ type: 'SHAKE_ENDED' })}
        />
      )}
      {state.phase === 'closed' && (
        <button type="button" onClick={() => dispatch({ type: 'OPEN' })}>
          {REOPEN_BUTTON_LABEL}
        </button>
      )}
      <CrumpleScene
        phase={state.phase}
        snapshotUrl={state.snapshotUrl}
        tossSeed={state.tossSeed}
        formRect={formRect}
        onCrumpleFinished={() => dispatch({ type: 'CRUMPLE_FINISHED' })}
        onBallRested={() => dispatch({ type: 'BALL_RESTED' })}
        onSettleFinished={() => dispatch({ type: 'SETTLE_FINISHED' })}
      />
      <footer className="powered-by">
        <a href={REPO_URL}>{POWERED_BY_TEXT}</a>
      </footer>
    </main>
  );
}
