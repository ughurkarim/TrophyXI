# Trophy XI agent guide

- Preserve the regal stadium/archive system in `DESIGN_SYSTEM.md`.
- Preserve Trophy XI's original interface, card geometry, logos, and visual
  identity.
- Keep domain logic in `src/engine`, typed content in `src/data`, and state/migration
  rules in `src/store`.
- Treat `playerIdentityId` as the duplicate boundary; version ids are not identity.
- Exclude opponent-lineup identities at generation, hydration, pre-match, and
  simulation boundaries.
- Preserve the user-selected open-position draft order. Do not reintroduce a fixed
  slot sequence or replacement picks.
- Never return to position-first drafting. Every player spin must contain five
  unique identities, and a player-card click alone must never place the player.
- Always show Position Fit before placement. Displayed penalties must use the
  engine formula, and no accepted placement may eliminate every draft-completion
  path.
- Never let multiple animation systems control the same transform property.
- Never move tactical nodes between interaction states; preserve exact formation
  coordinates and centered scaling.
- Preserve the two-player-respin limit. Respins remain deterministic, confirmed,
  permanent, player-only, and identity-rejecting.
- Preserve exactly one separate deterministic Formation Respin. Formation and
  player respin counters must never affect one another.
- Preserve Bench 1/2/3 order semantics and deterministic substitutions.
- Preserve bidirectional Era Translation. Never treat era selection only as a
  player-card filter.
- Preserve the explicit active archive boundary. Research-only player and manager
  records cannot enter generation, hydration repair, or play.
- Preserve the seven status tiers, the 99 rating ceiling, restricted 99-card
  cohort, lower-card coverage, weighted starter/bench offers, and all high-card
  hard limits.
- Chemistry preview and commit must call the same production team-rating path.
  Hover/focus must recalculate for the exact fixed formation slot.
- Keep modeled player/manager tags separate from sourced accolades. Named honors
  require card-level citations, and player accolade reveals stay finite.
- Keep tournament and era presentation reverse chronological, with Neutral / All
  Eras last. Preserve Champions Only as the default opponent filter.
- Run `npm run validate:data` after any player, manager, formation, era, champion,
  image, or source change.
- Permissioned EA/SoFIFA player faces must be card-specific and stored at
  `assets/players/{year}/{card-id}.png`. Use the local conditional cache first;
  make at most one request every two seconds and never exceed 5,000 downloads
  per UTC calendar day. The former UTC 00:00–06:00 window no longer applies.
  Preserve the original PNG bytes, embedded metadata, and watermarks. Keep the
  required attribution:
  “EA SPORTS player imagery, sourced via SoFIFA, used under project-specific
  permission.” Use FIFA 14 for 2014, FIFA 18 for 2018, FIFA 23 for the
  November–December 2022 tournament, and EA SPORTS FC 26 for 2026. Never
  substitute another tournament version's face. Never hotlink.
- Active manager portraits must remain local, permissioned, exact-year assets
  with complete source, author, license, context, and change metadata. Never
  hotlink them or infer an unstated image context.
- Never fabricate historical opponent statistics, managers, formations, or
  lineups. Preserve nation-year opponent identity and label Trophy XI models.
- Never mark a 2026 champion without verified local result data. Never force a
  World Cup All-Stars result; preserve the ordinary deterministic simulation.
- Never populate an unknown tournament statistic with zero. Named achievements and
  factual stats require a published card-level source.
- Preserve source-faithful historical nation names and neutral archival markers
  for defunct country codes. Never restore retired champion-only composite labels.
- Ratings and attributes are project-created estimates, not official claims.
- Add or update unit/component/E2E coverage whenever engine or flow behavior changes.
- Preserve keyboard access, focus visibility, semantic landmarks, live regions,
  hydration notices, reduced motion, and mobile tap targets.
