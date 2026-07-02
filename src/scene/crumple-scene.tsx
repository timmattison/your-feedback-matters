import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import * as THREE from 'three';
import './scene.css';
import type { Phase } from '../core/feedback-machine';
import { createCrumpleField } from '../core/crumple';
import {
  domRectToWorld,
  visibleWorldHeight,
  worldPointToScreen,
  worldRadiusToScreen,
} from '../core/screen-to-world';
import {
  inspectReducer,
  initialInspectState,
  type InspectPhase,
} from '../core/inspect-machine';
import {
  pickBallAt,
  basketScreenRect,
  type ScreenBall,
  type ScreenRect,
} from '../core/pick-ball';
import {
  BASKET_HEIGHT,
  BASKET_RADIUS,
  CAMERA_DISTANCE,
  CAMERA_FOV_DEG,
  GRAVITY_Y,
  PICK_MIN_RADIUS_PX,
  PICK_RADIUS_SCALE,
  PILE_FRICTION,
  PILE_RESTITUTION,
  SCRIM_OPACITY,
  SCRIM_RENDER_ORDER,
} from '../core/constants';
import { joltDelayMs } from '../core/jolt';
import { CrumplingPaper } from './crumpling-paper';
import { InspectedNote } from './inspected-note';
import { PaperBall } from './paper-ball';
import { Wastebasket } from './wastebasket';
import { Ground } from './ground';

export interface CrumpleSceneProps {
  phase: Phase;
  /**
   * Whether the basket should be on-screen. False on the closed landing, which
   * slides the whole scene overlay off to the right; true once the form opens,
   * sliding it back in. The scene stays mounted either way so the transition
   * (see `.scene-overlay` in scene.css) can animate — and so the pile of tossed
   * paper survives the closed↔open cycle. Each flip also kicks the pile.
   */
  visible: boolean;
  snapshotUrl: string | null;
  tossSeed: number;
  formRect: DOMRect | null;
  onCrumpleFinished(): void;
  onBallRested(): void;
  /**
   * Called with true while a fished-out note is being inspected (opening/open),
   * false once back to browsing — the app marks the DOM form `inert` so it can't
   * be typed into behind the scrim.
   */
  onInspectingChange(inspecting: boolean): void;
}

const CAMERA = { fovDeg: CAMERA_FOV_DEG, distance: CAMERA_DISTANCE };

// A single crumpled paper living in the scene. Persists across tosses (made
// shots pile up) until it falls out of the basket and is removed.
interface PileEntry {
  id: number;
  geometry: THREE.BufferGeometry;
  snapshotUrl: string | null;
  startPosition: [number, number, number];
  ballRadius: number;
  seed: number;
  // The sheet's world dimensions at toss time — feeds the pick math and the
  // un-crumple back to a flat note in later phases.
  width: number;
  height: number;
  // Live resting pose, tracked once the wad settles into the pile. Both stay
  // null until the wad first comes to rest; the fly-back animation reads them.
  restPosition: [number, number, number] | null;
  restQuaternion: [number, number, number, number] | null;
}

// Ready-to-use screen-space picking model, projected inside the Canvas (where
// size/basketBase/pile live) and handed to the DOM hit-layer outside it.
interface PickModel {
  basketRect: ScreenRect;
  balls: ScreenBall[];
}

interface SceneContentsProps extends CrumpleSceneProps {
  inspectPhase: InspectPhase;
  inspectNoteId: number | null;
  onOpenDone(): void;
  onCloseDone(): void;
  onPickModelChange(model: PickModel): void;
}

function SceneContents(props: SceneContentsProps) {
  const { size } = useThree();
  const worldH = visibleWorldHeight(CAMERA);
  const worldW = worldH * (size.width / size.height);

  // basket sits bottom-right, mouth opening upward
  const basketBase = useMemo<[number, number, number]>(
    () => [worldW / 2 - BASKET_RADIUS * 2.2, -worldH / 2 + 0.15, 0],
    [worldW, worldH],
  );
  const basketMouth = useMemo(
    () => ({
      x: basketBase[0],
      y: basketBase[1] + BASKET_HEIGHT,
      z: basketBase[2],
    }),
    [basketBase],
  );

  const worldRect = useMemo(
    () =>
      props.formRect === null
        ? null
        : domRectToWorld(
            props.formRect,
            { width: size.width, height: size.height },
            CAMERA,
          ),
    [props.formRect, size.width, size.height],
  );

  const field = useMemo(
    () =>
      worldRect === null
        ? null
        : createCrumpleField(props.tossSeed, worldRect.width, worldRect.height),
    [props.tossSeed, worldRect],
  );

  // The pile: every crumpled ball ever tossed that hasn't fallen out. It lives
  // in state here (SceneContents never unmounts while in full3d), so paper
  // accumulates across the closed↔open cycle and new tosses land on the stack.
  const [pile, setPile] = useState<PileEntry[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const nextId = useRef(0);

  const removeBall = useCallback((id: number) => {
    setPile((current) => current.filter((entry) => entry.id !== id));
  }, []);

  // Once a note is fished out it is no longer the "active toss": clear activeId so
  // that when it is re-thrown on dismiss it does NOT report onRested to the
  // feedback machine, which must stay in idle across the whole inspect round trip.
  useEffect(() => {
    if (props.inspectNoteId !== null) {
      setActiveId((cur) => (cur === props.inspectNoteId ? null : cur));
    }
  }, [props.inspectNoteId]);

  // On dismiss-complete, clear the note's resting pose (it is about to be thrown
  // again, so it must not be pickable until it re-settles) and then tell the
  // machine the close finished — which returns to browsing and swaps this note
  // back for a PaperBall that tosses it into the basket.
  const onCloseDoneProp = props.onCloseDone;
  const handleCloseDone = useCallback(() => {
    const id = props.inspectNoteId;
    if (id !== null) {
      setPile((current) =>
        current.map((e) =>
          e.id === id ? { ...e, restPosition: null, restQuaternion: null } : e,
        ),
      );
    }
    onCloseDoneProp();
  }, [props.inspectNoteId, onCloseDoneProp]);

  // Bump a nonce whenever the basket slides (visible flips), which each resting
  // ball turns into a kick. Skip the initial mount — only actual slides jolt.
  // The slide-IN kick is held until the basket has finished arriving on-screen
  // (joltDelayMs); firing it at t=0 would scatter the pile while it is still off
  // to the right, where nobody can see the papers go flying. If visibility flips
  // again before a pending kick fires, the cleanup cancels the stale one.
  const [joltNonce, setJoltNonce] = useState(0);
  const lastVisible = useRef(props.visible);
  useEffect(() => {
    if (lastVisible.current === props.visible) return;
    const becomingVisible = props.visible;
    lastVisible.current = props.visible;
    const timer = setTimeout(
      () => setJoltNonce((n) => n + 1),
      joltDelayMs(becomingVisible),
    );
    return () => clearTimeout(timer);
  }, [props.visible]);

  // Project the basket rect and every resting wad into screen space here, where
  // size/basketBase/pile live, and hand the finished model up to the DOM
  // hit-layer outside the Canvas — which can then be pure consume-and-dispatch.
  const onPickModelChange = props.onPickModelChange;
  const pickModel = useMemo<PickModel>(() => {
    const viewport = { width: size.width, height: size.height };
    return {
      basketRect: basketScreenRect(
        basketBase,
        BASKET_HEIGHT,
        BASKET_RADIUS,
        viewport,
        CAMERA,
      ),
      balls: pile
        .filter((entry) => entry.restPosition !== null)
        .map((entry) => {
          const rest = entry.restPosition as [number, number, number];
          const center = worldPointToScreen(rest, viewport, CAMERA);
          return {
            id: entry.id,
            cx: center.x,
            cy: center.y,
            // Pad the projected wad radius so clicking anywhere on the small,
            // low-sitting wad registers (see PICK_* in constants).
            r: Math.max(
              worldRadiusToScreen(entry.ballRadius, viewport, CAMERA) *
                PICK_RADIUS_SCALE,
              PICK_MIN_RADIUS_PX,
            ),
            depth: rest[2],
          };
        }),
    };
  }, [size.width, size.height, basketBase, pile]);
  useEffect(() => {
    onPickModelChange(pickModel);
  }, [pickModel, onPickModelChange]);

  return (
    <>
      <ambientLight intensity={0.6} />
      {/* sky/ground gradient gives the round steel basket its shaded falloff */}
      <hemisphereLight args={['#ffffff', '#3a3f47', 0.6]} />
      <directionalLight position={[4, 6, 8]} intensity={1.4} />
      {/* soft fill from the opposite side so the shadowed wall isn't pure black */}
      <directionalLight position={[-5, 2, -3]} intensity={0.35} />
      <Physics
        gravity={[0, GRAVITY_Y, 0]}
        allowSleep
        defaultContactMaterial={{
          friction: PILE_FRICTION,
          restitution: PILE_RESTITUTION,
        }}
      >
        <Ground y={-worldH / 2 + 0.1} />
        <Wastebasket base={basketBase} />
        {props.phase === 'crumpling' &&
          field !== null &&
          worldRect !== null && (
            <CrumplingPaper
              field={field}
              worldRect={worldRect}
              snapshotUrl={props.snapshotUrl}
              onCrumpleFinished={(geometry) => {
                const id = nextId.current++;
                setPile((current) => [
                  ...current,
                  {
                    id,
                    geometry,
                    snapshotUrl: props.snapshotUrl,
                    startPosition: worldRect.center,
                    ballRadius: field.ballRadius,
                    seed: props.tossSeed,
                    width: worldRect.width,
                    height: worldRect.height,
                    restPosition: null,
                    restQuaternion: null,
                  },
                ]);
                setActiveId(id);
                props.onCrumpleFinished();
              }}
            />
          )}
        {pile.map((entry) => {
          // The phase of THIS note if it is the one being inspected, else null. The
          // `&& props.inspectPhase !== 'browsing'` both gates the swap and narrows the
          // phase to the non-browsing union InspectedNote expects. On dismiss the
          // machine returns to browsing, this becomes a fresh PaperBall again, and it
          // re-tosses itself into the basket — reusing the stored geometry (three
          // re-uploads it after the earlier InspectedNote swap disposed it).
          const inspectedPhase =
            entry.id === props.inspectNoteId &&
            props.inspectPhase !== 'browsing'
              ? props.inspectPhase
              : null;
          return inspectedPhase !== null ? (
            <InspectedNote
              key={entry.id}
              entry={entry}
              phase={inspectedPhase}
              onOpenDone={props.onOpenDone}
              onCloseDone={handleCloseDone}
            />
          ) : (
            <PaperBall
              key={entry.id}
              geometry={entry.geometry}
              snapshotUrl={entry.snapshotUrl}
              startPosition={entry.startPosition}
              ballRadius={entry.ballRadius}
              seed={entry.seed}
              basketMouth={basketMouth}
              basketBase={basketBase}
              isActive={entry.id === activeId}
              joltNonce={joltNonce}
              onRested={props.onBallRested}
              onFellOut={() => removeBall(entry.id)}
              onRestPose={(pose) =>
                setPile((current) =>
                  current.map((e) =>
                    e.id === entry.id
                      ? {
                          ...e,
                          restPosition: pose.position,
                          restQuaternion: pose.quaternion,
                        }
                      : e,
                  ),
                )
              }
            />
          );
        })}
        {/* The scrim: transparent + depthTest off, with a LOWER renderOrder than
            the note, so in three's transparent pass it draws after the (default
            renderOrder 0) pile but before the note — dimming basket/pile/form-
            behind while the pulled note stays bright. */}
        {props.inspectPhase !== 'browsing' && (
          <mesh renderOrder={SCRIM_RENDER_ORDER} position={[0, 0, 0]}>
            {/* Oversized so it covers the viewport at z = 0 with margin. */}
            <planeGeometry args={[worldW * 1.5, worldH * 1.5]} />
            <meshBasicMaterial
              color="black"
              transparent
              opacity={SCRIM_OPACITY}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
        )}
      </Physics>
    </>
  );
}

export function CrumpleScene(props: CrumpleSceneProps) {
  const [inspect, dispatchInspect] = useReducer(
    inspectReducer,
    initialInspectState,
  );
  const [pickModel, setPickModel] = useState<PickModel | null>(null);

  // A resting wad is clickable only while the form is open (idle) and no note
  // is currently pulled (browsing). The hit-layer is a DOM div scoped to the
  // basket's screen rect, so the centered form stays fully typeable.
  const armed = props.phase === 'idle' && inspect.phase === 'browsing';

  // Tell the app whenever a note is being inspected, so it can `inert` the form.
  const onInspectingChange = props.onInspectingChange;
  useEffect(() => {
    onInspectingChange(inspect.phase !== 'browsing');
  }, [inspect.phase, onInspectingChange]);

  return (
    <div
      className={`scene-overlay${props.visible ? '' : ' scene-overlay--hidden'}`}
    >
      <Canvas
        gl={{ alpha: true }}
        camera={{ fov: CAMERA_FOV_DEG, position: [0, 0, CAMERA_DISTANCE] }}
      >
        <SceneContents
          {...props}
          inspectPhase={inspect.phase}
          inspectNoteId={inspect.noteId}
          onOpenDone={() => dispatchInspect({ type: 'OPEN_DONE' })}
          onCloseDone={() => dispatchInspect({ type: 'CLOSE_DONE' })}
          onPickModelChange={(model) => setPickModel(model)}
        />
      </Canvas>
      {armed && pickModel !== null && (
        <div
          className="basket-hit-layer"
          style={{
            position: 'absolute',
            left: pickModel.basketRect.left,
            top: pickModel.basketRect.top,
            width: pickModel.basketRect.width,
            height: pickModel.basketRect.height,
          }}
          onClick={(event) => {
            const id = pickBallAt(
              { x: event.clientX, y: event.clientY },
              pickModel.balls,
            );
            if (id !== null) dispatchInspect({ type: 'INSPECT', noteId: id });
          }}
        />
      )}
      {inspect.phase === 'open' && (
        <div
          className="dismiss-catcher"
          onClick={() => dispatchInspect({ type: 'DISMISS' })}
        />
      )}
    </div>
  );
}
