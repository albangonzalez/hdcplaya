import { accountsCollection } from "./account"
import { auditLogsCollection } from "./audit-log"
import { chargesCollection } from "./charge"
import { feeSettingsCollection } from "./fee-setting"
import { filesCollection } from "./file"
import { paymentsCollection } from "./payment"
import { transactionsCollection } from "./transaction"
import { unitsCollection } from "./unit"
import { usersCollection } from "./user"

// Creates the indexes the model relies on. Safe to run repeatedly.
export async function ensureIndexes() {
  await Promise.all([
    usersCollection().createIndex({ supabaseUserId: 1 }, { unique: true }),
    usersCollection().createIndex({ email: 1 }, { unique: true }),

    unitsCollection().createIndex({ identifier: 1 }, { unique: true }),
    unitsCollection().createIndex({ "owners.userId": 1 }),

    feeSettingsCollection().createIndex({ effectiveFrom: 1 }, { unique: true }),

    // A month's fee cannot be generated twice for the same unit.
    chargesCollection().createIndex(
      { unitId: 1, period: 1 },
      { unique: true, partialFilterExpression: { kind: "regular" } }
    ),
    // A unit gets one charge per special assessment.
    chargesCollection().createIndex(
      { unitId: 1, specialAssessmentId: 1 },
      { unique: true, partialFilterExpression: { kind: "special" } }
    ),
    chargesCollection().createIndex({ status: 1, dueDate: 1 }),

    paymentsCollection().createIndex({ unitId: 1, date: -1 }),

    accountsCollection().createIndex({ name: 1 }, { unique: true }),

    transactionsCollection().createIndex({ date: -1 }),
    transactionsCollection().createIndex({ accountId: 1, date: -1 }),
    transactionsCollection().createIndex({ toAccountId: 1, date: -1 }),

    filesCollection().createIndex({ "attachedTo.type": 1, "attachedTo.id": 1 }),

    auditLogsCollection().createIndex({ collection: 1, documentId: 1, at: -1 }),
  ])
}
