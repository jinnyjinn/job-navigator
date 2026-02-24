import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";

// 교사 권한 확인
async function verifyTeacher() {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return { authorized: false, status: 401, error: "로그인이 필요합니다." };

    const { data: profile } = await serverSupabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!profile || profile.role !== "teacher") {
        return { authorized: false, status: 403, error: "교사 권한이 필요합니다." };
    }

    return { authorized: true, status: 200, error: null };
}

function getAdminClient() {
    return createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

// GET: 상담 요청 학생 목록 조회
export async function GET() {
    const { authorized, status, error } = await verifyTeacher();
    if (!authorized) return NextResponse.json({ error }, { status });

    const admin = getAdminClient();

    // counseling_requests + profiles join
    const { data, error: fetchError } = await admin
        .from("counseling_requests")
        .select(`
            id,
            student_id,
            created_at,
            profiles!counseling_requests_student_id_fkey (
                name,
                student_id,
                grade,
                class_name
            )
        `)
        .order("created_at", { ascending: false });

    if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({ requests: data || [] });
}
