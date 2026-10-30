import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { MongoClient } from "mongodb";
import { ensureIndexes } from "../src/server/repo/mongo";

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("init-indexes: MONGODB_URI is not set");
    process.exit(1);
  }
  const dbName = process.env.MONGODB_DB || "medisathi";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    await ensureIndexes(client.db(dbName));
    console.log(`init-indexes: indexes ready on db "${dbName}"`);
  } finally {
    await client.close();
  }
}

main().catch((err: unknown) => {
  console.error("init-indexes: failed", err instanceof Error ? err.message : err);
  process.exit(1);
});
