import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { MongoClient } from "mongodb";
import { ensureIndexes } from "../src/server/repo/mongo";

// Manual live check only (AGENTS.md §4.5). Run at most once per milestone.
// Uses the REAL database — never run from automated tests.
async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("smoke:mongo: MONGODB_URI is not set");
    process.exit(1);
  }
  const dbName = process.env.MONGODB_DB || "medisathi";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    await ensureIndexes(db);
    const col = db.collection("smoke_test");
    const key = `smoke_${Date.now()}`;
    await col.insertOne({ key, at: new Date() });
    const found = await col.findOne({ key });
    await col.deleteOne({ key });
    if (!found) throw new Error("insert+read roundtrip failed");
    console.log("smoke:mongo: OK (connect + indexes + insert/read/delete)");
  } finally {
    await client.close();
  }
}

main().catch((err: unknown) => {
  console.error("smoke:mongo: FAILED", err instanceof Error ? err.message : err);
  process.exit(1);
});
