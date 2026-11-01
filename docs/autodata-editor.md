# Offline AutoData Editor

The desktop-only editor is loaded by `page_autodata`. Game save bytes remain in
browser memory; only public website JSON is fetched. No save file, account name,
or character data is sent to a server. The mobile menu hides the editor.

- `js/features/autodata/core.js`: V10-derived Big5 binary parser and serializer,
  bounded keyed records, item limits, CSV validation. Unmodified saves roundtrip
  byte-for-byte. Unknown structures are rejected rather than guessed.
- `js/features/autodata/services.js`: canonical website item/map/drop data,
  IndexedDB favorites and five named presets, verified filesystem backups.
- `js/pages/autodata-page.js`: editing, multi-selection, CSV presets and storage
  dialogs. Users must confirm logout to the character-selection screen.

DATA overwrite requires File System Access permission, a verified independent
backup, unchanged original bytes and successful readback. The folder picker runs
directly from its own button. Selecting `SZO_AutoData_Backups` reuses that folder;
selecting its parent creates/reuses the child. The current page remembers the
folder; reopening requires selecting it again. Restore lists matching character
backup times and validates other settings before restoring. It backs up the
current version first. Unsupported browsers download a separate file and never
report a successful overwrite. Cancelling or failing backup prevents overwrite.

Preset names and contents persist separately from DATA. CSV is for presets only.
Legacy default names migrate to the generic custom-preset name without changing
saved rows or user-defined names.

## Verification

Run `node tools/test_autodata_core.cjs <sample_3.data>` for 0/1/47/127/251 records,
byte preservation, invalid structures, CSV and backup failure/conflict tests.
Run `node tools/test_autodata_browser.cjs <sample_3.data>` for Chrome/Edge UI,
desktop-only mobile behavior, map 12, presets, warnings and filesystem-flow mocks.
The tests only read the supplied save; writes use in-memory mock handles.
Native permission dialogs and actual game compatibility require user testing on
a copied save. Do not use player originals as automated write targets.
