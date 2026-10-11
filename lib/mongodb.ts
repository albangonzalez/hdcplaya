import {
  MongoClient,
  type ClientSession,
  type Collection,
  type Db,
  type Document,
} from "mongodb"

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

let transactionsSupported: Promise<boolean> | undefined

// Runs several writes as one database transaction: pass `session` to every
// operation inside `run`. Transactions need a replica set (or mongos); on a
// standalone server, as in local development, `run` gets no session and its
// writes are applied one by one, without a rollback if one of them fails.
export async function withTransaction<T>(
  run: (session: ClientSession | undefined) => Promise<T>
): Promise<T> {
  const client = getMongoClient()
  transactionsSupported ??= client
    .db()
    .admin()
    .command({ hello: 1 })
    .then((hello) => Boolean(hello.setName) || hello.msg === "isdbgrid")
    .catch(() => false)

  if (!(await transactionsSupported)) {
    return run(undefined)
  }

  return client.withSession((session) =>
    session.withTransaction(() => run(session))
  )
}
