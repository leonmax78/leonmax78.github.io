# Tower floors

The shared source is `data/stage_maps.json`. Tower stages carry
`mapCategory: "tower"`, ten numbered `areas`, and a `floor` on each
numbered-island monster/NPC marker. Consumers must filter spawn points by
floor BEFORE collecting monster IDs and drops; a monster ID can occur on
several floors. Other stages currently belong to the general map group.
Expansion/collaboration categories can later extend `mapCategory` without
changing real stage IDs. Do not infer expansion ownership from ID ranges.

Run `python -X utf8 tools/build_tower_floors.py` after rebuilding stage maps.
The generator reads the extracted DATA1 MPC files under
`outputs/1029-client/DATA1/map`, preserving existing curated marker sets.
It uses 4-connected walkable tile components and landing TAGs, not proximity
to map labels or monster names. It refuses conflicting region assignments
and unexpected unassigned monster points. `reports/tower-floor-audit.json`
contains floor-by-floor monster names for review.

## Evidence and scope

- Stages 284-294 and 342-348 contain floors 1-180. Stage 349 is not present;
  no floor 181 is synthesized from the outgoing transfer.
- The first map uses TAGs 42,43,45,46,47,48,49,50,52,51. Later maps use
  41,42,43,45,46,47,48,49,50,51. Transfer chains establish this progression;
  missing direct edges can use monster-death events or NPC dialogue.
- Stage 291 message 261872 explicitly identifies the three branching
  floors as 72,73,74; 261874 identifies 76,77,78.
- Stage 347 TAG 42 has two disconnected landing islands: both are floor162.
  Messages 263928/263929/263936 and death events 305/306 explain the gaps;
  NPC message 263931 explicitly offers floor166 (TAG47).
- Three stage284 entry-island monster points (15723) remain unnumbered as
  the waiting area. They are not added to floor-specific item drop filters.
- Existing name-based `tower_floors` values and reused label coordinates
  are replaced by per-spawn spatial membership.

## Verification

`node tools/test_tower_floors.cjs` checks all180 floor records, floor-specific
map markers, monster choices, and canonical reverse-drop sets for37/38.
Map labels show floor numbers only; tower transfer text is hidden. Selecting
a floor recenters the map and checks that floor's monster markers.
The item editor displays monster names beside known drop counts and retains
the warning that incomplete drops do not mean an empty loot table.

This is static client-data analysis, not an in-game traversal. Keep MPC and
dialogue evidence available when reviewing future client updates.
