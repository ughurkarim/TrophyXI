# Trophy XI agent guide

- Preserve the regal stadium/archive system in `DESIGN_SYSTEM.md`.
- Never copy protected football-game layouts, card shapes, logos, or assets.
- Keep domain logic in `src/engine`, typed content in `src/data`, and state/migration
  rules in `src/store`.
- Treat `playerIdentityId` as the duplicate boundary; version ids are not identity.
- Exclude opponent-lineup identities at generation, hydration, pre-match, and
  simulation boundaries.
- Preserve the user-selected open-position draft order. Do not reintroduce a fixed
  slot sequence or replacement picks.
- Keep the one respin deterministic, confirmed, permanent, and identity-rejecting.
- Run `npm run validate:data` after any player, manager, formation, era, champion,
  image, or source change.
- Licensed images must be local, tournament-specific where possible, transparent
  PNG derivatives with complete source/author/license/change metadata. Never
  hotlink. Never present fallback art as a photograph.
- Never populate an unknown tournament statistic with zero. Named achievements and
  factual stats require a published card-level source.
- Ratings and attributes are project-created estimates, not official claims.
- Add or update unit/component/E2E coverage whenever engine or flow behavior changes.
- Preserve keyboard access, focus visibility, semantic landmarks, live regions,
  hydration notices, reduced motion, and mobile tap targets.
