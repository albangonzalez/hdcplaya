import { ObjectId } from "mongodb"

import { getMongoClient } from "@/lib/mongodb"
import {
  OWNERSHIP_SHARE_TOTAL,
  unitSchema,
  unitsCollection,
} from "@/models/unit"

// The condo's units, from the owners spreadsheet grouped by "Depto". The share
// is its "Indiviso", in shares out of 10,000, rounded to a whole share
// (234.976 -> 235).
const units: [identifier: string, ownershipShare: number][] = [
  ["A-1", 235],
  ["A-1 Bis", 197],
  ["A-2", 432],
  ["A-3", 432],
  ["A-4", 356],
  ["A-5", 432],
  ["A-6", 356],
  ["B-1", 213],
  ["B-1 Bis", 204],
  ["B-2", 391],
  ["B-3", 347],
  ["B-4", 333],
  ["B-5", 262],
  ["B-6", 259],
  ["C-1", 163],
  ["C-2", 242],
  ["C-3", 391],
  ["C-4", 327],
  ["C-5", 327],
  ["C-6", 330],
  ["C-7", 327],
  ["D-1", 204],
  ["D-1 Bis", 167],
  ["D-2", 276],
  ["D-3", 323],
  ["E-1", 456],
  ["E-2", 463],
  ["E-3", 380],
  ["E-4", 390],
  ["E-5", 395],
  ["E-6", 390],
]

// Adds the units that are missing. A unit that already exists is left as it
// is, so the seeder can be run again without undoing later edits.
async function seedUnits() {
  const total = units.reduce((sum, [, share]) => sum + share, 0)
  if (total !== OWNERSHIP_SHARE_TOTAL) {
    throw new Error(`Ownership shares add up to ${total}`)
  }

  const collection = unitsCollection()
  const now = new Date()
  let created = 0

  for (const [identifier, ownershipShare] of units) {
    if (await collection.findOne({ identifier })) continue

    await collection.insertOne(
      unitSchema.parse({
        _id: new ObjectId(),
        identifier,
        ownershipShare,
        owners: [],
        tenants: [],
        parkingSpaces: [],
        createdAt: now,
        updatedAt: now,
      })
    )
    created += 1
  }

  console.log(
    `Units: ${created} created, ${units.length - created} already there.`
  )
}

seedUnits()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => getMongoClient().close())
