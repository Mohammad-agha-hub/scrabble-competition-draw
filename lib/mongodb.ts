import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "tournament_grouper";

if (!uri) {
  throw new Error(
    "Missing MONGODB_URI. Copy .env.local.example to .env.local and set your MongoDB connection string."
  );
}

// Cache the client across hot-reloads in dev and across lambda invocations in prod.
let cached = global as unknown as {
  _mongoClientPromise?: Promise<MongoClient>;
};

const clientPromise: Promise<MongoClient> =
  cached._mongoClientPromise ??
  (cached._mongoClientPromise = new MongoClient(uri).connect());

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}
