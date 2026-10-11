import { getMongoClient } from "@/lib/mongodb"
import { ensureIndexes } from "@/models/indexes"

// Creates the indexes the model relies on. Safe to run again.
ensureIndexes()
  .then(() => console.log("Indexes are in place."))
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => getMongoClient().close())
