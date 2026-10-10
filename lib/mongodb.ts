import { MongoClient, type Collection, type Db, type Document } from "mongodb"

// Reuse one client across hot reloads in development, where modules are
// re-evaluated and would otherwise open a new connection pool each time.
const globalForMongo = globalThis as typeof globalThis & {
  mongoClient?: MongoClient
}

export function getMongoClient(): MongoClient {
  if (!globalForMongo.mongoClient) {
    const uri = process.env.MONGODB_URI
    if (!uri) {
      throw new Error("MONGODB_URI is not set")
    }
    globalForMongo.mongoClient = new MongoClient(uri)
  }

  return globalForMongo.mongoClient
}

// The database name comes from the path of MONGODB_URI.
export function getDb(): Db {
  return getMongoClient().db()
}

export function getCollection<T extends Document>(name: string): Collection<T> {
  return getDb().collection<T>(name)
}
