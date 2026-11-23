import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(
  new URL("../src/app/globals.css", import.meta.url),
  "utf8",
);
const tokens = Object.fromEntries(
  [...css.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/gi)].map((match) => [
    match[1],
    match[2],
  ]),
);

function luminance(hex: string): number {
  const linear = [1, 3, 5].map((offset) => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrast(foreground: string, background: string): number {
  assert.match(foreground, /^#[0-9a-f]{6}$/i);
  assert.match(background, /^#[0-9a-f]{6}$/i);
  const values = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (values[0] + 0.05) / (values[1] + 0.05);
}

for (const surface of ["#ffffff", tokens.paper, tokens.tint]) {
  for (const foreground of ["ink", "muted", "green", "green-dark"]) {
    test(`${foreground} text meets AA on ${surface}`, () => {
      const ratio = contrast(tokens[foreground], surface);
      assert.ok(ratio >= 4.5, `${ratio.toFixed(2)}:1 is below 4.5:1`);
    });
  }
  for (const foreground of ["control-line", "focus"]) {
    test(`${foreground} remains distinguishable on ${surface}`, () => {
      const ratio = contrast(tokens[foreground], surface);
      assert.ok(ratio >= 3, `${ratio.toFixed(2)}:1 is below 3:1`);
    });
  }
}

for (const status of ["pending", "progress", "resolved", "rejected"]) {
  test(`${status} badge text meets AA at its small text size`, () => {
    const ratio = contrast(
      tokens[`${status}-ink`],
      tokens[`${status}-surface`],
    );
    assert.ok(ratio >= 4.5, `${ratio.toFixed(2)}:1 is below 4.5:1`);
  });
}

test("primary action labels meet AA", () => {
  for (const surface of ["green", "green-dark"]) {
    assert.ok(contrast("#ffffff", tokens[surface]) >= 4.5);
  }
});

test("disabled labels remain legible even though WCAG exempts inactive controls", () => {
  assert.ok(
    contrast(tokens["disabled-ink"], tokens["disabled-surface"]) >= 4.5,
  );
});
