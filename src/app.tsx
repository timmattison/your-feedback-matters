import { useEffect, useReducer, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import './app.css';
import { FeedbackForm } from './feedback-form';
import { CrumpleScene } from './scene/crumple-scene';
import { feedbackReducer, initialState } from './core/feedback-machine';
import { detectAnimationMode, type AnimationMode } from './core/animation-mode';
import { POWERED_BY_TEXT, REOPEN_BUTTON_LABEL, REPO_URL } from './core/copy';

export interface AppProps {
  /**
   * Forces the animation mode instead of auto-detecting it via
   * {@link detectAnimationMode}. Intended for tests; production callers
   * should omit this so the mode is derived from the user's environment
   * (prefers-reduced-motion + WebGL availability).
   */
  mode?: AnimationMode;
}

export function App({ mode }: AppProps = {}) {
  // Resolved once per mount so a mid-session change to the media query or
  // WebGL support doesn't yank the user between rendering strategies
  // mid-animation.
  const [resolvedMode] = useState<AnimationMode>(
    () => mode ?? detectAnimationMode(),
  );
  const [state, dispatch] = useReducer(feedbackReducer, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [formRect, setFormRect] = useState<DOMRect | null>(null);

  // The fallback modes (css, instant) have no 3D scene to hand the form off
  // to, so they keep it mounted and visible through the whole toss,
  // animating in place instead.
  const animatingWithoutScene =
    resolvedMode !== 'full3d' &&
    (state.phase === 'crumpling' ||
      state.phase === 'tossing' ||
      state.phase === 'settling');

  const formVisible =
    state.phase === 'idle' ||
    state.phase === 'error' ||
    state.phase === 'capturing' ||
    animatingWithoutScene;

  // Capture a snapshot of the form for the 3D crumpled-paper texture. The
  // fallback modes never render that texture, so they skip the (relatively
  // expensive) DOM-to-image capture entirely and advance immediately.
  useEffect(() => {
    if (state.phase !== 'capturing') return;
    if (resolvedMode !== 'full3d') {
      dispatch({ type: 'CAPTURED', snapshotUrl: null });
      return;
    }
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
  }, [state.phase, resolvedMode]);

  // Fallback modes have no physics toss: as soon as the crumple "starts",
  // walk the machine straight through to settling. A CSS animation (css
  // mode) or a brief fade (instant mode) stands in for the toss instead.
  useEffect(() => {
    if (state.phase !== 'crumpling' || resolvedMode === 'full3d') return;
    dispatch({ type: 'CRUMPLE_FINISHED' });
    dispatch({ type: 'BALL_RESTED' });
  }, [state.phase, resolvedMode]);

  // full3d relies on the scene's onSettleFinished callback, with this timer
  // as a safety net. instant has no scene at all, so this timer is its only
  // way out of 'settling'. css mode resolves via the form wrapper's
  // animationend instead (see below) and is excluded here.
  useEffect(() => {
    if (state.phase !== 'settling' || resolvedMode === 'css') return;
    const delay = resolvedMode === 'instant' ? 200 : 1200;
    const id = setTimeout(() => dispatch({ type: 'SETTLE_FINISHED' }), delay);
    return () => clearTimeout(id);
  }, [state.phase, resolvedMode]);

  const formElement = (
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
  );

  return (
    <main className="page">
      {formVisible &&
        (resolvedMode === 'full3d' ? (
          formElement
        ) : (
          <div
            className={
              animatingWithoutScene
                ? resolvedMode === 'css'
                  ? 'css-toss'
                  : 'instant-fade'
                : undefined
            }
            onAnimationEnd={() => {
              if (resolvedMode === 'css') {
                dispatch({ type: 'SETTLE_FINISHED' });
              }
            }}
          >
            {formElement}
          </div>
        ))}
      {state.phase === 'closed' && (
        <button type="button" onClick={() => dispatch({ type: 'OPEN' })}>
          {REOPEN_BUTTON_LABEL}
        </button>
      )}
      {resolvedMode === 'full3d' && (
        <CrumpleScene
          phase={state.phase}
          snapshotUrl={state.snapshotUrl}
          tossSeed={state.tossSeed}
          formRect={formRect}
          onCrumpleFinished={() => dispatch({ type: 'CRUMPLE_FINISHED' })}
          onBallRested={() => dispatch({ type: 'BALL_RESTED' })}
          onSettleFinished={() => dispatch({ type: 'SETTLE_FINISHED' })}
        />
      )}
      <footer className="powered-by">
        <a href={REPO_URL}>{POWERED_BY_TEXT}</a>
      </footer>
    </main>
  );
}
