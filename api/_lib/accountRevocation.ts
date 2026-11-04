import { databaseSql as sql } from './db.js'

// Revocation is explicit: a metadata API 404 is not proof that a verified session was deleted.
export async function isAccountRevoked(userId: string): Promise<boolean> {
  const rows = await sql`select user_id from revoked_clerk_accounts where user_id=${userId} limit 1`
  return rows.length > 0
}
export async function revokeAccount(userId: string) {
  await sql`insert into revoked_clerk_accounts(user_id) values(${userId}) on conflict (user_id) do nothing`
}
