const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Helper to read .env.local without dotenv package
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            content.split('\n').forEach(line => {
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) {
                    const key = match[1].trim();
                    const value = match[2].trim().replace(/^['"]|['"]$/g, '');
                    if (!process.env[key]) {
                        process.env[key] = value;
                    }
                }
            });
        }
    } catch (e) {
        console.warn('Could not read .env.local');
    }
}

loadEnv();

// Usage: SERVICE_ROLE_KEY=... node scripts/bulk_create_users.js
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_SERVICE_ROLE_KEY is required.');
    console.error('Usage (Windows): $env:SERVICE_ROLE_KEY="your_key"; node scripts/bulk_create_users.js');
    console.error('Usage (Mac/Linux): SERVICE_ROLE_KEY=your_key node scripts/bulk_create_users.js');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function main() {
    console.log('Fetching students from "students" table...');

    // 1. Fetch students
    const { data: students, error } = await supabase
        .from('students')
        .select('*');

    if (error) {
        console.error('Error fetching students:', error.message);
        return;
    }

    if (!students || students.length === 0) {
        console.log('No students found in the table.');
        return;
    }

    console.log(`Found ${students.length} students. Starting account creation...`);

    let successCount = 0;
    let failCount = 0;

    for (const student of students) {
        // Determine Student Number (prioritize student_number column, fallback to id)
        const studentNumber = student.student_number || student.id;

        // 1. ID(Email): Use student number to make fake email
        const email = `${studentNumber}@jobnavigator.com`;

        // 2. Password: Use password column
        // Ensure password is at least 6 chars for Supabase (default policy)
        // 2. Password: Use password column or default to 'student1'
        let password = student.password;
        // Force default password to 'student1' if missing or too short, or if user wants consistent passwords
        if (!password || password.length < 6) {
            console.warn(`Warning: Password for ${studentNumber} is too short or missing. Using default 'student1'.`);
            password = 'student1';
        }

        const name = student.name || `Student ${studentNumber}`;
        const department = student.department || '';

        try {
            // 3. Create User with email_confirm: true (skip verification)
            const { data: user, error: createError } = await supabase.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true,
                user_metadata: {
                    name: name,
                    department: department,
                    student_number: studentNumber,
                    role: 'student'
                }
            });

            if (createError) {
                throw createError;
            }

            console.log(`✅ Created user: ${name} (${email})`);
            successCount++;
        } catch (err) {
            console.error(`❌ Failed to create user for ${name} (${email}):`, err.message);
            failCount++;
        }
    }

    console.log('\n-----------------------------------');
    console.log(`Job Complete.`);
    console.log(`Success: ${successCount} / ${students.length}`);
    console.log(`Failed: ${failCount}`);
    console.log('-----------------------------------');
}

main().catch(console.error);
