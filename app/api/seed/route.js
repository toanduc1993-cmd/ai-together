import { readDBAsync, writeDBAsync } from "@/lib/db";
import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

// Seed Supabase from local db.json (run once)
export async function POST(req) {
    try {
        // Read from the bundled db.json file
        const dbPath = join(process.cwd(), "data", "db.json");
        let seedData;
        try {
            seedData = JSON.parse(readFileSync(dbPath, "utf-8"));
        } catch {
            return NextResponse.json({ error: "No db.json found to seed from" }, { status: 404 });
        }

        // Write all data to Supabase
        await writeDBAsync(seedData);

        // Verify
        const verify = await readDBAsync();
        const keys = Object.keys(verify);

        return NextResponse.json({
            success: true,
            message: `Seeded ${keys.length} collections: ${keys.join(", ")}`,
            memberCount: verify.members?.length || 0,
            taskCount: verify.tasks?.length || 0,
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
