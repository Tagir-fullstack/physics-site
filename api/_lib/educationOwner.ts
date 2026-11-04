import {eq} from 'drizzle-orm'
import {db,schema} from './db.js'
import {isAdmin,type ClerkUser} from './auth.js'

// Only server-maintained merge links can share a teaching workspace.
export async function educationOwner(user: ClerkUser): Promise<ClerkUser> {
  const [profile]=await db.select({mergedInto:schema.educationProfiles.mergedIntoUserId}).from(schema.educationProfiles).where(eq(schema.educationProfiles.userId,user.userId)).limit(1)
  if(!profile?.mergedInto)return user
  const [target]=await db.select({mergedInto:schema.educationProfiles.mergedIntoUserId,role:schema.educationProfiles.role}).from(schema.educationProfiles).where(eq(schema.educationProfiles.userId,profile.mergedInto)).limit(1)
  if(!target||target.mergedInto||target.role!=='teacher')throw Error('Invalid teaching account merge')
  return {...user,userId:profile.mergedInto,accessRole:isAdmin(user)?'admin':user.accessRole}
}
