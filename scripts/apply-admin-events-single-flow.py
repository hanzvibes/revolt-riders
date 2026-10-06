from pathlib import Path
import re


def replace_once(text: str, pattern: str, replacement: str, label: str, flags: int = 0) -> str:
    updated, count = re.subn(pattern, lambda _match: replacement, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return updated


page_path = Path("app/admin/page.tsx")
page = page_path.read_text()

for exact in [
    'import { ModalSheet } from "@/components/modal-sheet";\n',
    'import { FloatingActionButton } from "@/components/floating-action-button";\n',
    '  Send,\n',
    '  Trash2,\n',
]:
    if exact not in page:
        raise RuntimeError(f"missing expected page fragment: {exact.strip()}")
    page = page.replace(exact, "", 1)

page = replace_once(
    page,
    r'  const \[title, setTitle\] = useState\(""\);\n'
    r'  const \[type, setType\] = useState\("kopdar"\);\n'
    r'  const \[location, setLocation\] = useState\(""\);\n'
    r'  const \[locationUrl, setLocationUrl\] = useState\(""\);\n'
    r'  const \[description, setDescription\] = useState\(""\);\n'
    r'  const \[start, setStart\] = useState\(""\);\n'
    r'  const \[meetup, setMeetup\] = useState\(""\);\n'
    r'  const \[end, setEnd\] = useState\(""\);\n',
    "",
    "event create state",
)

if '  const [agendaFormOpen, setAgendaFormOpen] = useState(false);\n' not in page:
    raise RuntimeError("agenda form state not found")
page = page.replace('  const [agendaFormOpen, setAgendaFormOpen] = useState(false);\n', "", 1)

page = replace_once(
    page,
    r'  const invalidateAgendaCaches = \(\) => \{[\s\S]*?\n  \};\n\n'
    r'  const invalidateRideDerivedCaches = \(\) => \{[\s\S]*?\n  \};\n\n',
    "",
    "legacy event cache helpers",
)

page = replace_once(
    page,
    r'\n\n  const createEvent = async \(event: FormEvent\) => \{[\s\S]*?\n  \};\n\n  const generateInvite',
    '\n\n  const generateInvite',
    "legacy createEvent",
)

page = replace_once(
    page,
    r'\n  const deleteEventPermanently = async \(eventRecord: EventRecord\) => \{[\s\S]*?\n  \};\n\n  const changeEventStatus = async \([\s\S]*?\n  \};\n\n  if \(authLoading',
    '\n  if (authLoading',
    "legacy event lifecycle handlers",
)

page = replace_once(
    page,
    r'\n        <FloatingActionButton[\s\S]*?\n        <section className="form-card card">',
    '\n\n        <section className="form-card card">',
    "legacy event create/status UI",
)

for forbidden in [
    "const createEvent =",
    "onSubmit={createEvent}",
    "new Date(start).toISOString()",
    "const changeEventStatus =",
    "const deleteEventPermanently =",
    "setAgendaFormOpen",
]:
    if forbidden in page:
        raise RuntimeError(f"legacy event flow still present: {forbidden}")
if 'href="/admin/events"' not in page:
    raise RuntimeError("admin events workspace link was lost")

page_path.write_text(page)

contract_path = Path("tests/production-contract.test.mjs")
contract = contract_path.read_text()

contract = replace_once(
    contract,
    r'test\("Event deletion stays behind the authorized RPC", async \(\) => \{[\s\S]*?\n\}\);',
    '''test("Event deletion stays behind the authorized RPC", async () => {
  const eventActions = await read("app/admin/events/events-actions.ts");
  const adminDashboard = await read("app/admin/page.tsx");
  const migration = await read("supabase/migrations/20260920121211_add_voyager_activity_system.sql");

  assert.match(eventActions, /rpc\("delete_event"/);
  assert.doesNotMatch(adminDashboard, /rpc\("delete_event"/);
  for (const source of [eventActions, adminDashboard]) {
    assert.doesNotMatch(source, /from\("events"\)\.delete/);
    assert.doesNotMatch(source, /from\("ride_logs"\)\.(?:delete|update)/);
  }

  assert.match(migration, /delete from public\.ride_logs/);
  assert.match(migration, /delete from public\.events/);
  assert.match(migration, /event\.delete/);
});''',
    "event deletion contract",
)

contract = replace_once(
    contract,
    r'test\("Mandatory agenda lifecycle auto-syncs official KM when ready", async \(\) => \{[\s\S]*?\n\}\);',
    '''test("Mandatory agenda lifecycle auto-syncs official KM when ready", async () => {
  const screen = await read("app/admin/events/events-screen.tsx");
  const actions = await read("app/admin/events/events-actions.ts");

  assert.match(actions, /export const syncOfficialRidesIfReady/);
  assert.match(actions, /status === "draft"/);
  assert.match(screen, /Official KM tersinkron ke/);

  const calls = screen.match(/await syncOfficialRidesIfReady\(/g) ?? [];
  assert.ok(
    calls.length >= 3,
    "save, manual sync, and publish/complete lifecycle must share the sync guard",
  );
});''',
    "mandatory agenda lifecycle contract",
)

contract = replace_once(
    contract,
    r'test\("Legacy Admin agenda status flow preserves Official KM sync invariant", async \(\) => \{[\s\S]*?\n\}\);',
    '''test("Admin dashboard delegates agenda lifecycle to the events workspace", async () => {
  const admin = await read("app/admin/page.tsx");
  const actions = await read("app/admin/events/events-actions.ts");

  assert.doesNotMatch(admin, /sync_event_official_rides/);
  assert.doesNotMatch(admin, /from\("events"\)\s*\.update/);
  assert.match(actions, /sync_event_official_rides/);
  assert.match(actions, /export const updateEventStatus/);
});''',
    "legacy admin lifecycle contract",
)

contract_path.write_text(contract)
