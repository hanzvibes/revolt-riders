from pathlib import Path

path = Path("scripts/audit-ui-css.mjs")
source = path.read_text()
old = '''  "app/admin/page.tsx": [
    "counts_as_mandatory,official_distance_km",
    "sync_event_official_rides",
    "invalidateRideDerivedCaches",
    'role="status"',
  ],'''
new = '''  "app/admin/page.tsx": [
    "counts_as_mandatory,official_distance_km",
    'href="/admin/events"',
    'role="status"',
  ],
  "app/admin/events/events-actions.ts": [
    "sync_event_official_rides",
    "syncOfficialRidesIfReady",
  ],
  "app/admin/events/events-screen.tsx": [
    "invalidateAgendaCaches",
    'invalidateCache("riding:")',
    "syncOfficialRidesIfReady",
  ],'''
if source.count(old) != 1:
    raise SystemExit(f"expected one legacy consistency contract, got {source.count(old)}")
path.write_text(source.replace(old, new, 1))
