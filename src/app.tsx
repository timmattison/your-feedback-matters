import "./app.css";
import { POWERED_BY_TEXT, REPO_URL } from "./core/copy";

export function App() {
  return (
    <main className="page">
      <footer className="powered-by">
        <a href={REPO_URL}>{POWERED_BY_TEXT}</a>
      </footer>
    </main>
  );
}
