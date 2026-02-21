import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({
            error: 'Missing SUPABASE_SERVICE_ROLE_KEY in environment variables.',
            instruction: 'Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file.'
        }, { status: 500 });
    }

    // Create Admin Client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    try {
        // 1. Fetch all students
        const { data: students, error: fetchError } = await supabase
            .from('students')
            .select('*');

        if (fetchError) {
            return NextResponse.json({ error: `Failed to fetch students: ${fetchError.message}` }, { status: 500 });
        }

        if (!students || students.length === 0) {
            return NextResponse.json({ message: 'No students found in "students" table.' });
        }

        const results = {
            total_students: students.length,
            success_count: 0,
            fail_count: 0,
            details: [] as any[]
        };

        // 2. Loop and create users
        for (const student of students) {
            const studentNumber = student.student_number || student.id;
            const email = `${studentNumber}@jobnavigator.com`;
            const password = student.password || `student${studentNumber}`;
            const name = student.name || `Student ${studentNumber}`;
            const department = student.department || '';
            const className = student.class_name || '';

            // Skip if password is too short (Supabase default is 6)
            if (password.length < 6) {
                results.fail_count++;
                results.details.push({ student: name, error: "Password too short (min 6 chars)" });
                continue;
            }

            const { data: user, error: createError } = await supabase.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true,
                user_metadata: {
                    name: name,
                    department: department,
                    student_number: studentNumber,
                    role: 'student',
                    class_name: className
                }
            });

            if (createError) {
                results.fail_count++;
                results.details.push({ student: name, email, error: createError.message });
            } else {
                results.success_count++;
                // Optional: Update students table to mark as registered?
                // await supabase.from('students').update({ auth_user_id: user.user.id }).eq('id', student.id);
            }
        }

        return NextResponse.json({
            message: `User seeding complete.`,
            stats: results
        });

    } catch (error: any) {
        return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}
