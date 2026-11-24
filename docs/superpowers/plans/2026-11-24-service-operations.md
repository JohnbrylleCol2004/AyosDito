# AyosDito service operations, real accounts and interface refinement

**Goal:** Implement all seven requested recommendations, higher-contrast engaging UI using official Impeccable guidance, real resident sign-up with administrator approval, and safe live updates.

**User decision:** New resident accounts require administrator approval. Administrator roles are never self-selected. Existing accounts remain approved during migration. Email confirmation remains recommended/provider-managed; no assumption that hosted SMTP/email settings have been changed.

## Architecture and ownership

1. Operations subsystem (migration `202611240009_service_operations.sql`): separate report_workflows table keyed by report_id (assignee_id, responsible_office, target_date, duplicate_of, version), admin-only internal notes, private resident feedback and reviewed reopen requests. Versioned/locked admin RPCs; no raw writes. Reopen approval preserves previous audit/history, unpublishes summary and transitions resolved→in_progress through a controlled function. Duplicate links never expose another resident's private report and cannot form cycles. Optional private location coordinates live in a separate owner/admin table. Public map uses manually approved generalized map coordinates only. Components live in `src/components/operations/`, queries/actions in lib operations files.
2. Accounts subsystem (migration `202611240010_resident_approval.sql`): profiles approval_status pending/approved/rejected, real sign-up and callback/reset flows, pending account page, admin member review. Existing profiles default approved; new trigger rows pending. DB enforcement blocks unapproved operational mutations, not merely UI routes. Preserve trusted admin role provisioning.
3. Presentation: Impeccable audit/refinement in Operate mode. Preserve green map-pin identity, English/Filipino support, existing functionality and PWA privacy. Raise contrast, improve hierarchy/focus/touch targets and purposeful reduced-motion-safe feedback. No decorative gamification or invented stats.
4. Integration owned by root: operational widgets in report/detail/dashboard pages; monthly admin CSV/PDF export with formula-injection protection and bounded aggregation; map/pin selection with privacy separation; push subscription/outbox delivery with VAPID keys and opt-in controls; authenticated live refresh using RLS-safe Supabase Realtime events and debounced refresh/focus fallback.

## Constraints

- Read installed Next.js guides before code. Use local PostgreSQL and meaningful boundary/security/browser tests.
- Install official Impeccable locally under ignored `.superpowers/skills/impeccable`; follow its context and craft guidance.
- Keep notifications generic in external push payloads (no titles/addresses/evidence). Push disabled with actionable setup until VAPID/server scheduler are configured; do not claim delivery without a real subscription test.
- Publication projection remains separate from private report content/location. No third-party map service receives exact coordinates without user action; use an optional private pin and coarse public moderation pin.
- No auto-merge, push, paid setting change, public deployment or destructive migration. Apply only new migrations after local tests; request hosted application when concrete files are ready, continue independent work while waiting.
- Missing hosted migrations must be surfaced as setup errors, never fabricated zeros or silently passing live tests.
- One source of truth for shared dictionaries/types/page integration to avoid concurrent edits: root integrates cross-module exports.

## Execution and verification

- [x] Read Impeccable, inspect baseline and establish shared API contracts.
- [x] Implement/test operations migration/RPCs/widgets.
- [x] Implement/test real registration, approval database enforcement and admin review.
- [x] Refine interface/contrast and inspect mobile/desktop visuals.
- [x] Implement/test exports, optional map/location, push infrastructure and real-time refresh.
- [x] Apply or provide new hosted migrations; run live checks only where dependencies are actually available.
- [x] Full formatting/lint/types/local tests/production build, targeted browser checks, independent final security/quality review.
- [x] Document environment/setup, deployment, evidence and any external prerequisites honestly.

Final evidence: hosted009?012 verified; full local release gate and production browser suite passed (66 local tests,16 Edge passes,2 expected skips). See docs/service-operations-verification.md. Actual SMTP/push device delivery and publication of the final code remain explicit deployment acceptance steps.
