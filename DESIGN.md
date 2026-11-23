# AyosDito interface

## Direction

Preserve the established emerald civic interface and map-pin brand. Public access, installation, resident reporting and administrator workflows share a practical visual language. These are task surfaces: users should see what matters, understand a status and complete an action without a decorative sequence.

White content surfaces sit on a pale green neutral canvas. Dark evergreen text, readable secondary labels and stronger field boundaries support use on small screens. Green identifies the primary action and selected navigation. Status colors retain their familiar amber, blue, green and red meanings alongside visible text labels.

## Tokens

The source of truth is `src/app/globals.css`.

| Role                           | Token                     | Value     |
| ------------------------------ | ------------------------- | --------- |
| Primary action                 | `--green`                 | `#076b4c` |
| Strong accent and focus        | `--green-dark`, `--focus` | `#075641` |
| Main text                      | `--ink`                   | `#162c25` |
| Secondary and placeholder text | `--muted`                 | `#4b6055` |
| Canvas                         | `--paper`                 | `#f3f6f2` |
| Selected/quiet green surface   | `--tint`                  | `#e7f2e9` |
| Structural divider             | `--line`                  | `#d0dbd3` |
| Input boundary                 | `--control-line`          | `#758b7d` |

Use the `--pending-*`, `--progress-*`, `--resolved-*` and `--rejected-*` pairs for small status labels. Text needs 4.5:1 contrast, including placeholders and secondary text. Focus rings and control boundaries need 3:1 against their adjoining light surfaces. Disabled controls retain readable text without lowering the opacity of the complete control. `tests/contrast.test.ts` checks the semantic palette against these thresholds.

## Type, layout and hierarchy

Keep the existing Arial/Helvetica system sans stack. Use fixed application heading sizes, medium or bold weights for action and section labels, and tabular numerals for counts. Balance long headings; wrap user-entered content safely. Metadata and status labels should remain readable at 12px or above. Avoid redundant uppercase labels above page headings.

Keep the existing sidebar, header, panel, report card, field and button patterns. Use a subtle panel-heading surface and restrained full borders to separate groups. At mobile widths the sidebar becomes a two-column navigation grid; forms and report details become a single column. Content must fit at 320px without page-level horizontal scrolling. Tables can adapt to labeled rows; do not shrink their type to force a desktop layout onto a phone.

Buttons and primary navigation should offer at least 44px targets. Form inputs use a stronger border than structural panel dividers. Error and success messages include text and are never conveyed by color alone. Public and private content retain the existing distinction.

## States and feedback

Primary actions darken on hover; their arrow can shift slightly to reinforce direction. Report links use a quiet background and border change. Active navigation, empty-state icons and unread notifications share the pale green surface. Avoid bouncing buttons, floating report cards, page entrances and repeated decorative animation.

Keyboard focus uses an offset evergreen outline. Selection and carets use the existing green palette. Reduced-motion users receive the same visible state changes without movement; loading labels remain visible when rotating indicators stop. Native scrolling remains native.

## Verification

Inspect actual rendered pages at 320px, 390px, intermediate and desktop widths, including English and Filipino, keyboard focus, disabled fields, errors and long content. Palette tests do not establish complete WCAG compliance. Verify authenticated pages against a configured backend and check installation on a real device separately.

The initial visual evidence for this refinement was the existing November 23 screenshot set under `test-results`, checked against the current styles and components. Port 3000 was unavailable for the initial baseline; a normal development server was subsequently started for fresh Edge verification. Login, registration, password recovery and installation were rendered at 320px, 390px, 768px and 1440px with no page overflow. Rendered text checks across those public pages measured a minimum 5.99:1 contrast. Filipino login, input validation, visible keyboard focus and reduced motion were also checked. Current screenshots use the `ui-final-` prefix under `test-results`.

Protected resident and administrator views could not be reached with the existing demo credentials after the account-approval code changed; both sign-in attempts returned an error. Their final rendered states still need verification against a backend with the new schema. The Impeccable screenshot helper failed with a browser protocol connection error; installed Edge supplied the rendered evidence instead.
