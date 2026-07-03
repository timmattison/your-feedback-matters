import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { YourFeedbackMatters } from 'your-feedback-matters';

// The demo is a plain consumer of the published widget. In this workspace it
// resolves `your-feedback-matters` to the library source (see the alias in
// vite.config.ts) so edits hot-reload; an external app would resolve it to the
// built `dist/` via the package `exports` instead. The demo owns its own global
// resets (./index.css) — the widget ships none, so nothing leaks onto a host.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <YourFeedbackMatters />
  </StrictMode>,
);
