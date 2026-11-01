# Appearance Changer 0.1.11

Released 2026-11-01. Adds six named outfit slots, snapshot storage from current
changes or selected favorites, and confirmed one-click switching. Switching
restores changes absent from the new snapshot in all currently loaded archives.
Existing archive routing, backup hashes, transactional journals, game-process
checks and cross-archive partial-failure reporting are retained.

## Verification

- 32 favorites/UI/routing tests passed, including persistence, legacy migration,
  cancel, invalid inputs, small-window layout and cross-archive switching.
- 30 catalog/search/process-guard/updater tests passed.
- Core/data1 suite: 14 tests, 13 passed and one skipped because its optional local
  fixture was unavailable. Tests use temporary copies, not player game archives.
- Packaged EXE starts with `--help`; ZIP SHA256 and extracted EXE verified by the
  release script. Existing single-EXE update package format is unchanged.

## Defender Report

A user reported isolation as `Trojan:Win32/Bearfoos.A!ml`. This has not been
reproduced locally and is not confirmed to be a false positive by Microsoft.
No Defender settings or exclusion lists were changed, and no quarantined files
were restored. The fresh build disables UPX and includes truthful Windows product
version metadata; it does not request administrator elevation. These changes do
not establish trust, substitute for signing, or guarantee future detection results.

On 2026-11-01, Microsoft Defender custom scans of the final EXE and release ZIP
returned exit code 0 and "found no threats", using definitions `1.463.70.0`.
The EXE is **not Authenticode-signed**. No Microsoft review verdict is available.

- ZIP SHA256: `60363cb71e46bda8df812f3ced14a10bf103cc8f7ba2b88575925ab6ac37cbee`
- EXE SHA256: `b7982d077c204d417f091c704072e5bfcc4b14405ce1fedb41385e9a53ecc27b`

If isolation continues, retain the affected file's exact hash and detection name.
Do not disable antivirus or add exclusions. Submit the exact release artifact for
review at https://www.microsoft.com/en-us/wdsi/filesubmission using the software
developer / suspected incorrect detection option. Local scan results are not a
substitute for Microsoft's analysis of the affected artifact.
