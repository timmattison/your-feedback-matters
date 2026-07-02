export interface CrumpleSceneProps {
  phase: import('../core/feedback-machine').Phase;
  snapshotUrl: string | null;
  tossSeed: number;
  formRect: DOMRect | null;
  onCrumpleFinished(): void;
  onBallRested(): void;
  onSettleFinished(): void;
}

export function CrumpleScene(_props: CrumpleSceneProps) {
  return null;
}
