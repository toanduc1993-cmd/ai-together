const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
    const { data: projects } = await supabase.from('projects').select('id, title').limit(5);
    console.log('--- PROJECTS ---');
    console.log(projects);
    const { data: modules } = await supabase.from('modules').select('id, project_id, title').limit(5);
    console.log('--- MODULES ---');
    console.log(modules);
    const { data: checklists } = await supabase.from('checklist_items').select('id, module_id, title').limit(5);
    console.log('--- CHECKLIST_ITEMS ---');
    console.log(checklists);
}
inspect().catch(console.error);
