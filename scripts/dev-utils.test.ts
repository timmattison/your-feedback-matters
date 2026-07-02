import { describe, expect, it } from "vitest";
import { buildViteArgs, parsePort } from "./dev-utils.ts";

describe("parsePort", () => {
  it("parses portplz output with a trailing newline", () => {
    expect(parsePort("37641\n")).toBe(37641);
  });

  it("parses output with surrounding whitespace", () => {
    expect(parsePort("  8080  \n")).toBe(8080);
  });

  it("rejects empty output", () => {
    expect(parsePort("")).toBeNull();
  });

  it("rejects non-numeric output", () => {
    expect(parsePort("command not found")).toBeNull();
  });

  it("rejects digits with trailing garbage", () => {
    expect(parsePort("8080abc")).toBeNull();
  });

  it("rejects port 0", () => {
    expect(parsePort("0")).toBeNull();
  });

  it("rejects ports above 65535", () => {
    expect(parsePort("70000")).toBeNull();
  });
});

describe("buildViteArgs", () => {
  it("pins the port strictly and opens the browser", () => {
    const port = parsePort("37641");
    expect(port).not.toBeNull();
    if (port === null) throw new Error("unreachable");
    expect(buildViteArgs(port)).toEqual([
      "exec",
      "vite",
      "--port",
      "37641",
      "--strictPort",
      "--open",
    ]);
  });
});
