import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const accPath = join(__dirname, "../src/data/accountability.json");
const outputPath = join(__dirname, "../migration_data.sql");

function escapeSql(str) {
  if (str === null || str === undefined) return "NULL";
  return `'${String(str).replace(/'/g, "''")}'`;
}

try {
  console.log(`Reading accountability data from ${accPath}...`);
  const data = JSON.parse(readFileSync(accPath, "utf8"));

  const sqlStatements = [];
  sqlStatements.push("-- Generated D1 database migration SQL");
  sqlStatements.push("DELETE FROM journey_metadata;");
  sqlStatements.push("DELETE FROM entries;");

  // Migrate metadata
  const journeyStart = escapeSql(data.journeyStart);
  const timezone = escapeSql(data.timeZone || data.timezone);
  sqlStatements.push(
    `INSERT INTO journey_metadata (id, journey_start, timezone) VALUES (1, ${journeyStart}, ${timezone});`
  );

  // Migrate entries (reverse order to keep chronological order if needed, but we can keep json file order)
  // Let's reverse them so that older items are inserted first (lower ID) if the JSON array has newest items first
  const entries = Array.isArray(data.entries) ? [...data.entries].reverse() : [];
  console.log(`Processing ${entries.length} entries...`);

  for (const entry of entries) {
    const type = escapeSql(entry.type);
    const timestamp = escapeSql(entry.timestamp || entry.date || entry.relapseTimestamp);
    const count = entry.count !== undefined ? entry.count : "NULL";

    // Gather any additional keys as metadata JSON
    const metaObj = { ...entry };
    delete metaObj.type;
    delete metaObj.timestamp;
    delete metaObj.date;
    delete metaObj.relapseTimestamp;
    delete metaObj.count;

    const meta = Object.keys(metaObj).length > 0 ? escapeSql(JSON.stringify(metaObj)) : "NULL";

    sqlStatements.push(
      `INSERT INTO entries (type, timestamp, count, meta) VALUES (${type}, ${timestamp}, ${count}, ${meta});`
    );
  }

  writeFileSync(outputPath, sqlStatements.join("\n") + "\n", "utf8");
  console.log(`\nSuccess! Migration SQL written to ${outputPath}`);
  console.log("\nNext steps to execute this migration:");
  console.log("1. Initialize local D1 database schema:");
  console.log("   npx wrangler d1 execute noarousal_db --local --file=schema.sql");
  console.log("2. Load the migrated data locally:");
  console.log("   npx wrangler d1 execute noarousal_db --local --file=migration_data.sql");
  console.log("3. Once database_id is configured in wrangler.toml, run in production:");
  console.log("   npx wrangler d1 execute noarousal_db --remote --file=schema.sql");
  console.log("   npx wrangler d1 execute noarousal_db --remote --file=migration_data.sql");

} catch (err) {
  console.error("Migration failed:", err);
}
