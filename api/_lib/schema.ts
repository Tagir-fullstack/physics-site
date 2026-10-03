import {
  pgTable,
  pgEnum,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  uuid,
  integer,
  smallint,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export const userRoleEnum = pgEnum('user_role', ['student', 'teacher', 'admin'])
export const verificationStatusEnum = pgEnum('verification_status', [
  'none',
  'pending',
  'verified',
  'rejected',
])
export const commentStatusEnum = pgEnum('comment_status', [
  'auto_approved',
  'pending',
  'approved',
  'rejected',
])

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkId: varchar('clerk_id', { length: 64 }).notNull().unique(),
    email: varchar('email', { length: 255 }).notNull(),
    displayName: varchar('display_name', { length: 255 }),
    avatarUrl: text('avatar_url'),
    role: userRoleEnum('role').notNull().default('student'),
    verificationStatus: verificationStatusEnum('verification_status')
      .notNull()
      .default('none'),
    school: varchar('school', { length: 255 }),
    city: varchar('city', { length: 120 }),
    subject: varchar('subject', { length: 120 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    clerkIdx: uniqueIndex('users_clerk_id_idx').on(t.clerkId),
    emailIdx: index('users_email_idx').on(t.email),
    roleIdx: index('users_role_idx').on(t.role),
  })
)

export const teacherVerifications = pgTable(
  'teacher_verifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    documentUrl: text('document_url').notNull(),
    documentType: varchar('document_type', { length: 64 }),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewNote: text('review_note'),
  },
  (t) => ({
    userIdx: index('teacher_verifications_user_idx').on(t.userId),
  })
)

export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    animationSlug: varchar('animation_slug', { length: 128 }).notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'),
    body: text('body').notNull(),
    status: commentStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    editedAt: timestamp('edited_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    animationIdx: index('comments_animation_idx').on(t.animationSlug),
    userIdx: index('comments_user_idx').on(t.userId),
    parentIdx: index('comments_parent_idx').on(t.parentId),
    statusIdx: index('comments_status_idx').on(t.status),
  })
)

export const commentReports = pgTable(
  'comment_reports',
  {
    id: serial('id').primaryKey(),
    commentId: uuid('comment_id')
      .notNull()
      .references(() => comments.id, { onDelete: 'cascade' }),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (t) => ({
    commentIdx: index('comment_reports_comment_idx').on(t.commentId),
  })
)

export const moderationLog = pgTable(
  'moderation_log',
  {
    id: serial('id').primaryKey(),
    commentId: uuid('comment_id')
      .notNull()
      .references(() => comments.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 64 }).notNull(),
    flagged: boolean('flagged').notNull(),
    categories: jsonb('categories'),
    scores: jsonb('scores'),
    action: varchar('action', { length: 32 }).notNull(),
    reviewerId: uuid('reviewer_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    commentIdx: index('moderation_log_comment_idx').on(t.commentId),
  })
)

export const ktpLanguageEnum = pgEnum('ktp_language', ['ru', 'kk'])

export const ktp = pgTable(
  'ktp',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    grade: smallint('grade').notNull(),
    language: ktpLanguageEnum('language').notNull().default('ru'),
    academicYear: varchar('academic_year', { length: 16 }),
    title: varchar('title', { length: 255 }).notNull(),
    hoursPerWeek: smallint('hours_per_week'),
    totalHours: smallint('total_hours'),
    sourceUrl: text('source_url'),
    sourceFilename: varchar('source_filename', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    gradeIdx: index('ktp_grade_idx').on(t.grade),
  })
)

export const ktpLessons = pgTable(
  'ktp_lessons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ktpId: uuid('ktp_id')
      .notNull()
      .references(() => ktp.id, { onDelete: 'cascade' }),
    orderNo: integer('order_no').notNull(),
    quarter: smallint('quarter'),
    section: text('section'),
    topic: text('topic'),
    objectives: text('objectives'),
    hours: smallint('hours'),
    plannedDate: varchar('planned_date', { length: 128 }),
    notes: text('notes'),
  },
  (t) => ({
    ktpIdx: index('ktp_lessons_ktp_idx').on(t.ktpId),
    orderIdx: uniqueIndex('ktp_lessons_ktp_order_idx').on(t.ktpId, t.orderNo),
  })
)

export const assessmentAttempts = pgTable(
  'assessment_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assessmentKey: varchar('assessment_key', { length: 64 }).notNull(),
    clerkUserId: varchar('clerk_user_id', { length: 64 }).notNull(),
    variantCode: varchar('variant_code', { length: 16 }).notNull(),
    variantFingerprint: varchar('variant_fingerprint', { length: 255 }).notNull(),
    variantData: jsonb('variant_data').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    answers: jsonb('answers'),
    score: smallint('score'),
    violations: jsonb('violations'),
  },
  (t) => ({
    userAssessmentIdx: uniqueIndex('assessment_attempts_user_key_idx').on(
      t.clerkUserId,
      t.assessmentKey
    ),
    variantCodeIdx: uniqueIndex('assessment_attempts_variant_code_idx').on(t.variantCode),
    fingerprintIdx: uniqueIndex('assessment_attempts_fingerprint_idx').on(
      t.variantFingerprint
    ),
  })
)

export const teacherClasses = pgTable(
  'teacher_classes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerClerkId: varchar('owner_clerk_id', { length: 64 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    subject: varchar('subject', { length: 120 }),
    inviteCode: varchar('invite_code', { length: 12 }).notNull(),
    archived: boolean('archived').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ownerIdx: index('teacher_classes_owner_idx').on(t.ownerClerkId),
    inviteIdx: uniqueIndex('teacher_classes_invite_idx').on(t.inviteCode),
  })
)

export const classStudents = pgTable(
  'class_students',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    classId: uuid('class_id').notNull().references(() => teacherClasses.id, { onDelete: 'cascade' }),
    lastName: varchar('last_name', { length: 60 }).notNull(),
    firstName: varchar('first_name', { length: 60 }).notNull(),
    groupName: varchar('group_name', { length: 40 }).notNull(),
    normalizedIdentity: varchar('normalized_identity', { length: 180 }).notNull(),
    joinTokenHash: varchar('join_token_hash', { length: 64 }).notNull(),
    active: boolean('active').notNull().default(true),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    classIdx: index('class_students_class_idx').on(t.classId),
    identityIdx: uniqueIndex('class_students_identity_idx').on(t.classId, t.normalizedIdentity),
    tokenIdx: uniqueIndex('class_students_token_idx').on(t.joinTokenHash),
  })
)

export const teacherTests = pgTable(
  'teacher_tests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerClerkId: varchar('owner_clerk_id', { length: 64 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    language: varchar('language', { length: 8 }).notNull().default('ru'),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    durationMinutes: smallint('duration_minutes').notNull().default(30),
    calculatorAllowed: boolean('calculator_allowed').notNull().default(true),
    shuffleQuestions: boolean('shuffle_questions').notNull().default(false),
    version: integer('version').notNull().default(1),
    sourceFilename: varchar('source_filename', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (t) => ({
    ownerIdx: index('teacher_tests_owner_idx').on(t.ownerClerkId),
    statusIdx: index('teacher_tests_status_idx').on(t.status),
  })
)

export const testQuestions = pgTable(
  'test_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    testId: uuid('test_id').notNull().references(() => teacherTests.id, { onDelete: 'cascade' }),
    orderNo: integer('order_no').notNull(),
    section: varchar('section', { length: 160 }),
    difficulty: varchar('difficulty', { length: 20 }),
    kind: varchar('kind', { length: 20 }).notNull(),
    prompt: text('prompt').notNull(),
    points: smallint('points').notNull().default(1),
    config: jsonb('config').notNull(),
  },
  (t) => ({
    testIdx: index('test_questions_test_idx').on(t.testId),
    orderIdx: uniqueIndex('test_questions_order_idx').on(t.testId, t.orderNo),
  })
)

export const testAssignments = pgTable(
  'test_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    testId: uuid('test_id').notNull().references(() => teacherTests.id, { onDelete: 'cascade' }),
    classId: uuid('class_id').notNull().references(() => teacherClasses.id, { onDelete: 'cascade' }),
    ownerClerkId: varchar('owner_clerk_id', { length: 64 }).notNull(),
    active: boolean('active').notNull().default(true),
    opensAt: timestamp('opens_at', { withTimezone: true }),
    closesAt: timestamp('closes_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ownerIdx: index('test_assignments_owner_idx').on(t.ownerClerkId),
    classIdx: index('test_assignments_class_idx').on(t.classId),
    uniqueAssignmentIdx: uniqueIndex('test_assignments_test_class_idx').on(t.testId, t.classId),
  })
)

export const teacherTestAttempts = pgTable(
  'teacher_test_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assignmentId: uuid('assignment_id').notNull().references(() => testAssignments.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id').notNull().references(() => classStudents.id, { onDelete: 'cascade' }),
    variantCode: varchar('variant_code', { length: 16 }).notNull(),
    variantData: jsonb('variant_data').notNull(),
    answers: jsonb('answers'),
    score: integer('score'),
    maxScore: integer('max_score').notNull(),
    violations: jsonb('violations'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
  },
  (t) => ({
    assignmentIdx: index('teacher_test_attempts_assignment_idx').on(t.assignmentId),
    studentIdx: index('teacher_test_attempts_student_idx').on(t.studentId),
    assignmentStudentIdx: uniqueIndex('teacher_test_attempts_assignment_student_idx').on(t.assignmentId, t.studentId),
    variantIdx: uniqueIndex('teacher_test_attempts_variant_idx').on(t.variantCode),
  })
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Comment = typeof comments.$inferSelect
export type NewComment = typeof comments.$inferInsert
export type TeacherVerification = typeof teacherVerifications.$inferSelect
export type Ktp = typeof ktp.$inferSelect
export type NewKtp = typeof ktp.$inferInsert
export type KtpLesson = typeof ktpLessons.$inferSelect
export type NewKtpLesson = typeof ktpLessons.$inferInsert
export type AssessmentAttempt = typeof assessmentAttempts.$inferSelect
export type TeacherClass = typeof teacherClasses.$inferSelect
export type ClassStudent = typeof classStudents.$inferSelect
export type TeacherTest = typeof teacherTests.$inferSelect
export type TestQuestion = typeof testQuestions.$inferSelect
export type TestAssignment = typeof testAssignments.$inferSelect
export type TeacherTestAttempt = typeof teacherTestAttempts.$inferSelect
