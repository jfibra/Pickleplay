# Migrations — folder layout

Migrations live in a **year / month / day** folder matching the date in their filename.
The filename keeps the full `YYYYMMDD_` prefix, so a file is still identifiable on its own
once it has been opened or pasted somewhere.

```
Documentation/migrations/
  2026/
    10/
      26/
        20261026_player_events.sql
        20261026_profiles_soft_delete.sql
    11/
      06/
        20261106_guide_view_count_rpc.sql
  README.md
```

These are applied by hand: open the file and paste it into the Supabase SQL editor.
They cover the one Supabase database shared by `web/`, `api/` and `mobile/`, which is why
they live at the repository root rather than inside `web/`.

## Where a new migration goes

A migration dated `20261106` goes in `2026/11/06/`. Create the folder if it is the first
one that day. Nothing generates these folders — they are made by hand alongside the file.

## What stays at the root

Files that are not a single dated migration: this `README.md`, and any
`RUN_ALL_*_pending.sql` bundle that concatenates several migrations from different days
for one paste into the Supabase SQL editor (they have no single date to file them under).

Test-data scripts are not migrations and do not belong here
(`web/test-squad-data.sql`, `web/cleanup-test-squads.sql`).

## Referring to a migration from code

Use the full path, since that is what someone will paste into their editor:

```ts
// See Documentation/migrations/2026/11/06/20261106_guide_view_count_rpc.sql
```

Ordering is by the date in the filename, then by name within a day — the folders are
purely for browsing. `find . -name '*.sql' | sort` gives the order to apply them in.

## Old numbered names

These files used to live in `web/migrations/` with a numeric prefix. Their dates come from
when each file was first added to the repository (or created, for files git never tracked).

| Old name | Now |
|---|---|
| `001_create_security_settings.sql` | `2026/02/05/20260205_create_security_settings.sql` |
| `002_create_court_events.sql` | `2026/02/05/20260205_create_court_events.sql` |
| `003_bookings_availability_policy.sql` | `2026/02/05/20260205_bookings_availability_policy.sql` |
| `004_add_cleaning_time_to_courts.sql` | `2026/02/05/20260205_add_cleaning_time_to_courts.sql` |
| `005_update_cleaning_time_constraint.sql` | `2026/02/05/20260205_update_cleaning_time_constraint.sql` |
| `006_setup_tournament_storage.sql` | `2026/02/06/20260206_setup_tournament_storage.sql` |
| `007_create_court_reviews.sql` | `2026/02/07/20260207_create_court_reviews.sql` |
| `web/add_password_set_at.sql` | `2026/02/07/20260207_add_password_set_at.sql` |
| `010_harden_two_factor_auth.sql` | `2026/03/21/20260321_harden_two_factor_auth.sql` |
| `011_normalize_two_factor_timestamps.sql` | `2026/03/21/20260321_normalize_two_factor_timestamps.sql` |
| `012_tournament_archive_columns.sql` | `2026/09/18/20260918_tournament_archive_columns.sql` |
| `013_profiles_soft_delete.sql` | `2026/10/26/20261026_profiles_soft_delete.sql` |
| `014_player_events.sql` | `2026/10/26/20261026_player_events.sql` |
| `015_guide_view_count_rpc.sql` | `2026/11/06/20261106_guide_view_count_rpc.sql` |

Within a day the files now apply alphabetically. On 2026-02-05 that changes the old order,
but the only dependency there (`update_cleaning_time_constraint` after
`add_cleaning_time_to_courts`) still holds.

### Referenced in code but not in this folder

Some code comments name migrations that were never committed to this repository:
`009` (`must_reset_password`), `012_allow_overnight_court_operation_hours.sql`,
`013_enable_dm_realtime_publication.sql`, `024` (`find_available_players`), `063` and `071`.
If you have those files, add them here under the date they were applied.
