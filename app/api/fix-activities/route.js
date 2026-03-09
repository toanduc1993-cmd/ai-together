import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// One-time migration: fix old activity records to include module title
export async function POST() {
    try {
        // Get all activities with action_type = 'module_status_changed' that have generic detail
        const { data: activities, error } = await supabase
            .from("activities")
            .select("id, entity_id, detail")
            .eq("action_type", "module_status_changed")
            .like("detail", "Chuyển module →%");

        if (error) throw error;
        if (!activities || activities.length === 0) {
            return NextResponse.json({ message: "No activities to fix", count: 0 });
        }

        let fixed = 0;
        for (const act of activities) {
            // Get module title
            const { data: mod } = await supabase
                .from("modules")
                .select("title")
                .eq("id", act.entity_id)
                .single();

            if (mod?.title) {
                // Replace "Chuyển module →" with 'Chuyển "Module Title" →'
                const newDetail = act.detail.replace("Chuyển module →", `Chuyển "${mod.title}" →`);
                await supabase
                    .from("activities")
                    .update({ detail: newDetail })
                    .eq("id", act.id);
                fixed++;
            }
        }

        return NextResponse.json({ message: `Fixed ${fixed} activities`, count: fixed });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
