import { render, screen } from "@testing-library/react";
import { App } from "./app";
import { POWERED_BY_TEXT, REPO_URL } from "./core/copy";

test("footer shows the Powered by badge linking to the repo", () => {
  render(<App />);
  const link = screen.getByRole("link", { name: POWERED_BY_TEXT });
  expect(link).toHaveAttribute("href", REPO_URL);
});
