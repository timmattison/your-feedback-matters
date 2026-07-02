import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
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

// The app now lands on the closed "Got feedback?" button; every form-driven
// path starts by clicking through to the open form.
async function openForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: REOPEN_BUTTON_LABEL }));
}

test('footer shows the Powered by badge linking to the repo', () => {
  render(<App />);
  const link = screen.getByRole('link', { name: POWERED_BY_TEXT });
  expect(link).toHaveAttribute('href', REPO_URL);
});

test('the Powered by badge is hidden on the landing and appears once opened', async () => {
  const user = userEvent.setup();
  render(<App />);
  expect(screen.queryByRole('link', { name: POWERED_BY_TEXT })).toBeNull();
  await openForm(user);
  expect(
    screen.getByRole('link', { name: POWERED_BY_TEXT }),
  ).toBeInTheDocument();
});

test('the page lands on the "Got feedback?" button, not the form', () => {
  render(<App />);
  expect(
    screen.getByRole('button', { name: REOPEN_BUTTON_LABEL }),
  ).toBeInTheDocument();
  expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
});

test('after a toss settles, it returns to the "Got feedback?" landing (empty on reopen)', async () => {
  const user = userEvent.setup();
  render(<App mode="full3d" />);
  await user.click(screen.getByRole('button', { name: REOPEN_BUTTON_LABEL }));
  await user.type(screen.getByLabelText('Name'), 'Tim');
  await user.type(screen.getByLabelText('Comment'), 'straight to the bin');
  await user.click(screen.getByRole('button', { name: TOSS_BUTTON_LABEL }));
  await waitFor(() => expect(sceneProps.current?.phase).toBe('crumpling'));
  act(() => sceneProps.current?.onCrumpleFinished());
  act(() => sceneProps.current?.onBallRested());
  // full3d leaves 'settling' via the 1200ms safety timer in app.tsx
  await waitFor(
    () =>
      expect(
        screen.getByRole('button', { name: REOPEN_BUTTON_LABEL }),
      ).toBeInTheDocument(),
    { timeout: 2000 },
  );
  expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  // reopening gives a fresh, empty form for another round
  await user.click(screen.getByRole('button', { name: REOPEN_BUTTON_LABEL }));
  expect(screen.getByLabelText('Name')).toHaveValue('');
  expect(screen.getByLabelText('Comment')).toHaveValue('');
});

test('the basket is slid out on the landing, slides in on open, and back out on cancel', async () => {
  const user = userEvent.setup();
  render(<App mode="full3d" />);
  // scene stays mounted so it can animate, but is told to hide on the landing
  expect(sceneProps.current?.visible).toBe(false);
  await user.click(screen.getByRole('button', { name: REOPEN_BUTTON_LABEL }));
  expect(sceneProps.current?.visible).toBe(true);
  await user.click(screen.getByRole('button', { name: CANCEL_BUTTON_LABEL }));
  expect(sceneProps.current?.visible).toBe(false);
});

test('cancel closes the form immediately and clears the fields', async () => {
  const user = userEvent.setup();
  render(<App />);
  await openForm(user);
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
  await openForm(user);
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
  await openForm(user);
  await user.click(screen.getByRole('button', { name: TOSS_BUTTON_LABEL }));
  await user.type(screen.getByLabelText('Comment'), 'x');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('a filled toss captures the form and hides it for the crumple', async () => {
  const user = userEvent.setup();
  render(<App mode="full3d" />);
  await openForm(user);
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

test('a failed snapshot capture still advances instead of sticking in capturing', async () => {
  const user = userEvent.setup();
  vi.mocked(toPng).mockRejectedValueOnce(new Error('capture failed'));
  render(<App mode="full3d" />);
  await openForm(user);
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

test('reduced-motion (instant) mode tosses without any 3D scene and resets quickly', async () => {
  sceneProps.current = null;
  const user = userEvent.setup();
  render(<App mode="instant" />);
  await openForm(user);
  await user.type(screen.getByLabelText('Name'), 'Tim');
  await user.type(screen.getByLabelText('Comment'), 'no motion please');
  await user.click(screen.getByRole('button', { name: TOSS_BUTTON_LABEL }));
  // resets straight back to the closed "Got feedback?" landing
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: REOPEN_BUTTON_LABEL }),
    ).toBeInTheDocument(),
  );
  expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  // reopening yields a fresh, empty form
  await openForm(user);
  expect(screen.getByLabelText('Comment')).toHaveValue('');
  // the scene component was never mounted, so it never touched sceneProps
  expect(sceneProps.current).toBeNull();
});

test('no-WebGL (css) mode plays a CSS toss animation on the form and resets on animationend', async () => {
  sceneProps.current = null;
  const user = userEvent.setup();
  render(<App mode="css" />);
  await openForm(user);
  await user.type(screen.getByLabelText('Name'), 'Tim');
  await user.type(screen.getByLabelText('Comment'), 'no webgl here');
  await user.click(screen.getByRole('button', { name: TOSS_BUTTON_LABEL }));

  const form = await screen.findByRole('form', { name: 'Feedback form' });
  const wrapper = form.parentElement;
  await waitFor(() => expect(wrapper).toHaveClass('css-toss'));
  expect(sceneProps.current).toBeNull();

  act(() => {
    fireEvent.animationEnd(wrapper as HTMLElement, {
      animationName: 'css-toss',
    });
  });
  // toss done → back to the closed landing; reopening is empty
  expect(
    screen.getByRole('button', { name: REOPEN_BUTTON_LABEL }),
  ).toBeInTheDocument();
  await openForm(user);
  expect(screen.getByLabelText('Name')).toHaveValue('');
  expect(screen.getByLabelText('Comment')).toHaveValue('');
});

test('css mode ignores animationend from other animations (e.g. a bubbled shake)', async () => {
  const user = userEvent.setup();
  render(<App mode="css" />);
  await openForm(user);
  await user.type(screen.getByLabelText('Name'), 'Tim');
  await user.type(screen.getByLabelText('Comment'), 'no webgl here');
  await user.click(screen.getByRole('button', { name: TOSS_BUTTON_LABEL }));

  const form = await screen.findByRole('form', { name: 'Feedback form' });
  const wrapper = form.parentElement as HTMLElement;
  await waitFor(() => expect(wrapper).toHaveClass('css-toss'));

  // The form's own `shake` animation bubbles its animationend up through
  // this wrapper. It must NOT end the toss early — only the wrapper's own
  // css-toss animation may advance the machine.
  act(() => {
    fireEvent.animationEnd(form, { animationName: 'shake' });
  });
  expect(screen.getByLabelText('Name')).toHaveValue('Tim');
  expect(wrapper).toHaveClass('css-toss');

  // ...and the real css-toss completion still resets to the closed landing.
  act(() => {
    fireEvent.animationEnd(wrapper, { animationName: 'css-toss' });
  });
  expect(
    screen.getByRole('button', { name: REOPEN_BUTTON_LABEL }),
  ).toBeInTheDocument();
  await openForm(user);
  expect(screen.getByLabelText('Name')).toHaveValue('');
  expect(screen.getByLabelText('Comment')).toHaveValue('');
});
