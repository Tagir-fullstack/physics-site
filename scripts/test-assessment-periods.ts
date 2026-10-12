import assert from 'node:assert/strict'
import { databaseSql as sql } from '../api/_lib/db.js'
import { rotationQuery, periodCatalog, currentPeriod, selectedPeriod } from '../api/_lib/assessmentPeriods.js'

// Test the real rotation statement against transaction-local temporary tables.
// ON COMMIT DROP ensures no fixtures survive; public student data is never changed.
const results = await sql.transaction([
  sql`create temp table assessment_periods (like public.assessment_periods including all) on commit drop`,
  sql`create temp table assessment_attempts (assessment_key text, submitted_at timestamptz, expires_at timestamptz) on commit drop`,
  sql`insert into assessment_periods (key, test_id, name, active) values ('old', 'mechanics', 'Old', true)`,
  sql`insert into assessment_attempts values ('old', null, now() + interval '1 hour'), ('old-archive-retry', now(), now())`,
  rotationQuery('old', 'blocked', 'Blocked'),
  sql`update assessment_attempts set submitted_at = now() where submitted_at is null`,
  rotationQuery('old', 'new', 'New'),
  rotationQuery('old', 'duplicate', 'Duplicate'),
  sql`select key, active, archived_at is not null as archived from assessment_periods order by key`,
  sql`select count(*)::int as count from assessment_attempts`,
], { isolationLevel: 'ReadCommitted' })
assert.equal(results[4].length, 0, 'Active student must prevent archival')
assert.equal(results[6][0].key, 'new')
assert.equal(results[7].length, 0, 'Stale administrator must not create another period')
assert.deepEqual(results[8], [
  { key: 'new', active: true, archived: false },
  { key: 'old', active: false, archived: true },
])
assert.equal(results[9][0].count, 2, 'Existing attempts, including retries, remain intact')
const catalog = await periodCatalog()
assert.equal(catalog.periods.filter(p => p.active && p.testId === 'mechanics').length, 1)
assert.equal((await currentPeriod()).available, true)
assert.equal(await selectedPeriod('nonexistent-period'), null)
console.log('PASS: rotation blocks active students, preserves all attempts, archives old period, creates one active period and rejects stale rotation; real catalog readable')
