# AyosDito

AyosDito is a bilingual barangay application for community issue reporting and resolution tracking. The existing Next.js application serves residents and barangay administrators through Supabase authentication and role-restricted pages. Filipino and English are supported.

## People and tasks

- Residents submit concerns, track their reports and official status history, and attach private photo evidence.
- Administrators review reports, update their status with an official note, and manage moderated community summaries.
- The community board shows explicitly published summaries and general zones. Personal details and private evidence belong in the protected reporting flow.
- Notifications and aggregate analytics help users follow activity. The install page explains how to install the PWA and when an internet connection is needed.

These capabilities describe the repository implementation, not a guarantee that every hosted environment has the required migrations and configuration.

## Interface priorities

Users need to identify the next action and understand the current state quickly, on phones as well as desktop browsers. Preserve the established emerald and map-pin identity. Keep the interface engaging through clear hierarchy, readable status cues, useful feedback and well-spaced content. Civic tasks should not depend on decorative animation or gamification.

Use plain language and preserve the distinction between private reporting and moderated public content. Avoid exposing implementation phases as instructions to residents. Account approval and other operations must describe their actual backend state; visual treatment alone must never imply authorization or a successful save.

## Evidence and scope

This context was captured from README.md, the existing routes and translations, and the user's request to improve contrast and polish the website and app. This pass refines the incumbent interface. It does not introduce a replacement brand or marketing claims.
