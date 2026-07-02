import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toPng } from 'html-to-image';
import { App } from './app';
import type { CrumpleSceneProps } from './scene/crumple-scene';
import {
  BLANK_FEEDBACK_MESSAGE,
  CANCEL_BUTTON_LABEL,
  POWERED_BY_TEXT,
  REOPEN_BUTTON_LABEL,
  REPO_URL,
  TOSS_BUTTON_LABEL,
} from './core/copy';

vi.mock('html-to-image', () => ({
  toPng: vi.fn(async () => 'data:image/png;base64,fake'),
}));

// three/@react-three/fiber cannot render in jsdom; the scene is verified
// visually (see task-8-brief Step 5), not in this suite. This mock captures
// the props App passes down so tests can drive the state machine through
// the scene's callbacks without a real WebGL context.
const sceneProps: { current: CrumpleSceneProps | null } = { current: null };
vi.mock('./scene/crumple-scene', () => ({
  CrumpleScene: (props: CrumpleSceneProps) => {
    sceneProps.current = props;
    return null;
  },
}));

test('footer shows the Powered by badge linking to the repo', () => {
  render(<App />);
  const link = screen.getByRole('link', { name: POWERED_BY_TEXT });
  expect(link).toHaveAttribute('href', REPO_URL);
});

test('cancel closes the form immediately and clears the fields', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.type(screen.getByLabelText('Name'), 'Tim');
  await user.type(screen.getByLabelText('Comment'), 'Needs more cowbell');
  await user.click(screen.getByRole('button', { name: CANCEL_BUTTON_LABEL }));
  expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: REOPEN_BUTTON_LABEL }));
  expect(screen.getByLabelText('Name')).toHaveValue('');
  expect(screen.getByLabelText('Comment')).toHaveValue('');
});

test('blank toss shakes the form and shows the scolding in red', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: TOSS_BUTTON_LABEL }));
  const alert = screen.getByRole('alert');
  expect(alert).toHaveTextContent(BLANK_FEEDBACK_MESSAGE);
  expect(screen.getByRole('form', { name: 'Feedback form' })).toHaveClass(
    'shake',
  );
});

test('editing a field clears the scolding', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: TOSS_BUTTON_LABEL }));
  await user.type(screen.getByLabelText('Comment'), 'x');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('a filled toss captures the form and hides it for the crumple', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.type(screen.getByLabelText('Name'), 'Tim');
  await user.type(screen.getByLabelText('Comment'), 'Needs more cowbell');
  await user.click(screen.getByRole('button', { name: TOSS_BUTTON_LABEL }));
  await waitFor(() =>
    expect(screen.queryByLabelText('Comment')).not.toBeInTheDocument(),
  );
  // mid-flight is not the closed state — no reopen button
  expect(
    screen.queryByRole('button', { name: REOPEN_BUTTON_LABEL }),
  ).toBeNull();
});

test('after the toss settles, a fresh empty form is ready for another round', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.type(screen.getByLabelText('Name'), 'Tim');
  await user.type(screen.getByLabelText('Comment'), 'straight to the bin');
  await user.click(screen.getByRole('button', { name: TOSS_BUTTON_LABEL }));
  await waitFor(() => expect(sceneProps.current?.phase).toBe('crumpling'));
  act(() => sceneProps.current?.onCrumpleFinished());
  expect(sceneProps.current?.phase).toBe('tossing');
  act(() => sceneProps.current?.onBallRested());
  expect(sceneProps.current?.phase).toBe('settling');
  act(() => sceneProps.current?.onSettleFinished());
  expect(screen.getByLabelText('Comment')).toHaveValue('');
  expect(screen.getByLabelText('Name')).toHaveValue('');
});

test('a failed snapshot capture still advances instead of sticking in capturing', async () => {
  const user = userEvent.setup();
  vi.mocked(toPng).mockRejectedValueOnce(new Error('capture failed'));
  render(<App />);
  await user.type(screen.getByLabelText('Name'), 'Tim');
  await user.type(screen.getByLabelText('Comment'), 'Needs more cowbell');
  await user.click(screen.getByRole('button', { name: TOSS_BUTTON_LABEL }));
  // the machine must reach 'crumpling' (with a null snapshot) — the form hides
  await waitFor(() =>
    expect(screen.queryByLabelText('Comment')).not.toBeInTheDocument(),
  );
  expect(
    screen.queryByRole('button', { name: REOPEN_BUTTON_LABEL }),
  ).toBeNull();
});
