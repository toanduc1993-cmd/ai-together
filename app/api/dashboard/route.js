import { getProjects, getAllModules, getUsers, getActivities, getNotifications } from "@/lib/supabase";
import { NextResponse } from "next/server";

// Consolidated endpoint — returns ALL data needed for dashboard + layout in 1 request
// Replaces 18+ individual API calls with a single call
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("user_id");

        // Run ALL queries in parallel — single Vercel function, no cold start penalty
        const [projects, modules, users, activities, notifications] = await Promise.all([
            getProjects(),
            getAllModules(),
            getUsers(),
            getActivities(50),
            userId ? getNotifications(userId) : Promise.resolve([]),
        ]);

        // Pre-calculate myTaskCount for sidebar badge
        let myTaskCount = 0;
        if (userId) {
            for (const mod of modules) {
                // Modules assigned to me (not done)
                if (mod.assigned_to === userId && mod.status !== "done") {
                    myTaskCount++;
                }
                // Modules needing my review (I'm chairman/lead and module is in_review)
                const proj = projects.find(p => p.id === mod.project_id);
                if (proj && (proj.chairman_id === userId || proj.lead_id === userId) &&
                    mod.status === "in_review" && mod.assigned_to !== userId) {
                    myTaskCount++;
                }
            }
        }

        return NextResponse.json({
            projects,
            modules,
            users,
            activities,
            notifications,
            myTaskCount,
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
