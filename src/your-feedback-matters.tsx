import { useEffect, useReducer, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import './your-feedback-matters.css';
import { FeedbackForm } from './feedback-form';
import { CrumpleScene } from './scene/crumple-scene';
import { createInitialState, feedbackReducer } from './core/feedback-machine';
import { DEFAULT_FIELDS, type FieldConfig } from './core/fields';
import { detectAnimationMode, type AnimationMode } from './core/animation-mode';
import { POWERED_BY_TEXT, REOPEN_BUTTON_LABEL, REPO_URL } from './core/copy';
import { includeInSnapshot } from './core/snapshot-filter';
import { captureWithFallback } from './core/capture-with-fallback';
import { CAPTURE_TIMEOUT_MS } from './core/constants';

// Class name and @keyframes name (src/your-feedback-matters.css) for the
// css-mode toss.
// The animationend handler keys on this exact animation name, so the class,
// the keyframes, and the guard must all agree.
const CSS_TOSS_ANIMATION = 'css-toss';

export interface YourFeedbackMattersProps {
  /**
   * Forces the animation mode instead of auto-detecting it via
   * {@link detectAnimationMode}. Intended for tests; production callers
   * should omit this so the mode is derived from the user's environment
   * (prefers-reduced-motion + WebGL availability).
   */
  mode?: AnimationMode;
  /**
   * The form fields to collect, in order. Defaults to a Name text field and a
   * Comment textarea. Like {@link mode}, this is read once at mount — changing
   * it afterwards has no effect.
   */
  fields?: FieldConfig[];
}

export function YourFeedbackMatters({
  mode,
  fields,
}: YourFeedbackMattersProps = {}) {
  // Resolved once per mount so a mid-session change to the media query or
  // WebGL support doesn't yank the user between rendering strategies
  // mid-animation.
  const [resolvedMode] = useState<AnimationMode>(
    () => mode ?? detectAnimationMode(),
  );
  // Read once at mount, like `mode`: the initial reducer state derives its
  // field keys and required set from this configuration.
  const [fieldConfigs] = useState<readonly FieldConfig[]>(
    () => fields ?? DEFAULT_FIELDS,
  );
  const [state, dispatch] = useReducer(
    feedbackReducer,
    fieldConfigs,
    createInitialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [formRect, setFormRect] = useState<DOMRect | null>(null);
  // True while the 3D scene has a fished-out note in the lightbox. The DOM form
  // is marked `inert` so it can't be typed into behind the scrim.
  const [inspecting, setInspecting] = useState(false);

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
      // No form to snapshot or crumple (should be unreachable — the form
      // is always mounted while phase is 'capturing'). The 3D scene only
      // mounts CrumplingPaper/PaperBall once formRect is set, so leaving
      // this at just CAPTURED would strand the machine in 'crumpling'
      // forever with no CRUMPLE_FINISHED ever firing. Walk the whole chain
      // by hand instead; the settling timer below takes it home from there.
      dispatch({ type: 'CAPTURED', snapshotUrl: null });
      dispatch({ type: 'CRUMPLE_FINISHED' });
      dispatch({ type: 'BALL_RESTED' });
      return;
    }
    setFormRect(node.getBoundingClientRect());
    let cancelled = false;
    // Race the capture against a timeout: a rejected OR stalled toPng both fall
    // back to a null (blank-textured) snapshot so the machine always leaves
    // 'capturing' and the form can never freeze mid-toss.
    captureWithFallback(
      toPng(node, { filter: includeInSnapshot }),
      CAPTURE_TIMEOUT_MS,
    ).then((url) => {
      if (!cancelled) dispatch({ type: 'CAPTURED', snapshotUrl: url });
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

  // full3d and instant both leave 'settling' via this timer — full3d has no
  // scene callback for it (the 1200ms delay here IS the settle path), and
  // instant has no scene at all. css mode resolves via the form wrapper's
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
      fieldConfigs={fieldConfigs}
      values={state.fields}
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
      inert={inspecting}
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
                  ? CSS_TOSS_ANIMATION
                  : 'instant-fade'
                : undefined
            }
            onAnimationEnd={(event) => {
              // animationend bubbles, so the form's own animations (e.g.
              // the error shake) pass through here too — only the wrapper's
              // toss animation itself may end the settle.
              if (
                resolvedMode === 'css' &&
                event.animationName === CSS_TOSS_ANIMATION
              ) {
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
          visible={state.phase !== 'closed'}
          snapshotUrl={state.snapshotUrl}
          tossSeed={state.tossSeed}
          formRect={formRect}
          onCrumpleFinished={() => dispatch({ type: 'CRUMPLE_FINISHED' })}
          onBallRested={() => dispatch({ type: 'BALL_RESTED' })}
          onInspectingChange={setInspecting}
        />
      )}
      {state.phase !== 'closed' && (
        <footer className="powered-by">
          <a href={REPO_URL}>{POWERED_BY_TEXT}</a>
        </footer>
      )}
    </main>
  );
}
