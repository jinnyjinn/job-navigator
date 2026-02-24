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

    // 1단계: counseling_requests 목록 조회
    const { data: requests, error: reqError } = await admin
        .from("counseling_requests")
        .select("id, student_id, created_at")
        .order("created_at", { ascending: false });

    if (reqError) {
        return NextResponse.json({ error: reqError.message }, { status: 500 });
    }

    if (!requests || requests.length === 0) {
        return NextResponse.json({ requests: [] });
    }

    // 2단계: 해당 학생들의 profiles 조회 (student_id = profiles.id)
    const studentIds = requests.map((r) => r.student_id);
    const { data: profiles } = await admin
        .from("profiles")
        .select("id, name, student_id, grade, class_name")
        .in("id", studentIds);

    // 3단계: 병합
    const profileMap = Object.fromEntries(
        (profiles || []).map((p) => [p.id, p])
    );

    const result = requests.map((r) => ({
        ...r,
        profiles: profileMap[r.student_id] ?? null,
    }));

    return NextResponse.json({ requests: result });
}
