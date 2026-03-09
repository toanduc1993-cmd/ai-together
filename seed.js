// Seed script — run once to populate Supabase from db.json
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = "https://rdhrflsndikojdexxujw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHJmbHNuZGlrb2pkZXh4dWp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjk0OTk2MiwiZXhwIjoyMDg4NTI1OTYyfQ.9bpjwVMbIiaPezeLq2R3LK6lRwmpSEEOHFRMIJXBmjU";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
    console.log("📂 Reading db.json...");
    const dbPath = path.join(__dirname, "data", "db.json");
    const data = JSON.parse(fs.readFileSync(dbPath, "utf-8"));

    const rows = Object.entries(data).map(([key, value]) => ({ key, value }));
    console.log(`📦 Seeding ${rows.length} rows: ${rows.map(r => r.key).join(", ")}`);

    const { error } = await supabase
        .from("app_data")
        .upsert(rows, { onConflict: "key" });

    if (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }

    // Verify
    const { data: verify, error: verifyError } = await supabase
        .from("app_data")
        .select("key");

    if (verifyError) {
        console.error("❌ Verify error:", verifyError.message);
        process.exit(1);
    }

    console.log(`✅ Seeded successfully! ${verify.length} keys in Supabase: ${verify.map(r => r.key).join(", ")}`);
}

seed();
