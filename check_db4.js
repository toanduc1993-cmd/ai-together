const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: projects } = await db.from('projects').select('id, title');
    console.log("Total Projects:", projects.length);
    for (const p of projects) {
        const { data: epics } = await db.from('epics').select('id').eq('project_id', p.id);
        const { data: modules } = await db.from('modules').select('id').eq('project_id', p.id);
        console.log(`[${p.title}] Epics: ${epics?.length}, Tasks: ${modules?.length}`);
    }
}
run();
