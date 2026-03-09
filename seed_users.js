// Seed users + enable RLS on Supabase
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    "https://rdhrflsndikojdexxujw.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHJmbHNuZGlrb2pkZXh4dWp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjk0OTk2MiwiZXhwIjoyMDg4NTI1OTYyfQ.9bpjwVMbIiaPezeLq2R3LK6lRwmpSEEOHFRMIJXBmjU"
);

const USERS = [
    { username: "le", email: "le@libetech.vn", password_hash: "123456", display_name: "Mr. Lê", role: "chairman", avatar: "👑", bio: "Chairman — Libe Tech", permissions: { canCreateTask: true, canAssignTask: true, canChangeStatus: true, canComment: true, canManageMembers: true, canManageRoles: true, canViewDashboard: true, canViewWorkflow: true, canCreateProject: true, canReview: true } },
    { username: "quan", email: "quan@libetech.vn", password_hash: "123456", display_name: "Quân", role: "project_lead", avatar: "🧑‍💻", bio: "Arch Lead", permissions: { canCreateTask: true, canAssignTask: true, canChangeStatus: true, canComment: true, canManageMembers: false, canManageRoles: false, canViewDashboard: true, canViewWorkflow: true, canCreateProject: false, canReview: false } },
    { username: "tuan", email: "tuan@libetech.vn", password_hash: "123456", display_name: "Tuấn", role: "developer", avatar: "🧑‍💻", bio: "Developer", permissions: { canCreateTask: true, canAssignTask: false, canChangeStatus: true, canComment: true, canManageMembers: false, canManageRoles: false, canViewDashboard: true, canViewWorkflow: true } },
    { username: "phuong", email: "phuong@libetech.vn", password_hash: "123456", display_name: "Phương", role: "developer", avatar: "🧑‍💻", bio: "Developer", permissions: { canCreateTask: true, canAssignTask: false, canChangeStatus: true, canComment: true, canManageMembers: false, canManageRoles: false, canViewDashboard: true, canViewWorkflow: true } },
    { username: "toan", email: "toan@libetech.vn", password_hash: "123456", display_name: "Toàn", role: "developer", avatar: "🧑‍💻", bio: "Developer", permissions: { canCreateTask: true, canAssignTask: false, canChangeStatus: true, canComment: true, canManageMembers: false, canManageRoles: false, canViewDashboard: true, canViewWorkflow: true } },
    { username: "linh", email: "linh@libetech.vn", password_hash: "123456", display_name: "Linh", role: "developer", avatar: "🧑‍💻", bio: "Developer", permissions: { canCreateTask: true, canAssignTask: false, canChangeStatus: true, canComment: true, canManageMembers: false, canManageRoles: false, canViewDashboard: true, canViewWorkflow: true } },
    { username: "loi", email: "loi@libetech.vn", password_hash: "123456", display_name: "Lợi", role: "developer", avatar: "🧑‍💻", bio: "Developer", permissions: { canCreateTask: true, canAssignTask: false, canChangeStatus: true, canComment: true, canManageMembers: false, canManageRoles: false, canViewDashboard: true, canViewWorkflow: true } },
];

async function seed() {
    console.log("🌱 Seeding users...");

    for (const user of USERS) {
        const { data, error } = await supabase.from("users").upsert(user, { onConflict: "username" }).select("id, username, role").single();
        if (error) {
            console.error(`❌ ${user.username}: ${error.message}`);
        } else {
            console.log(`✅ ${data.username} (${data.role}) → ${data.id}`);
        }
    }

    // Verify
    const { data: all, error: verErr } = await supabase.from("users").select("id, username, role, display_name");
    if (verErr) {
        console.error("❌ Verify error:", verErr.message);
    } else {
        console.log(`\n📊 Total users: ${all.length}`);
        all.forEach(u => console.log(`  ${u.username} (${u.role}) — ${u.display_name}`));
    }
}

seed();
