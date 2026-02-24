import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";

// 교사 권한 확인 헬퍼
async function verifyTeacher() {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return { authorized: false, status: 401, error: "로그인이 필요합니다.", user: null };

    const { data: profile } = await serverSupabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!profile || profile.role !== "teacher") {
        return { authorized: false, status: 403, error: "교사 권한이 필요합니다.", user: null };
    }

    return { authorized: true, status: 200, error: null, user };
}

function getAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

// GET: API 키 등록 여부 확인 (키 값 자체는 반환하지 않음 - 보안)
export async function GET() {
    const { authorized, status, error } = await verifyTeacher();
    if (!authorized) return NextResponse.json({ error }, { status });

    const adminClient = getAdminClient();
    const { data } = await adminClient
        .from("app_settings")
        .select("key, updated_at")
        .eq("key", "gemini_api_key")
        .maybeSingle();

    return NextResponse.json({
        isSet: !!data,
        updatedAt: data?.updated_at ?? null,
    });
}

// POST: API 키 저장 (교사만 가능)
export async function POST(req: NextRequest) {
    const { authorized, status, error, user } = await verifyTeacher();
    if (!authorized) return NextResponse.json({ error }, { status });

    const { apiKey } = await req.json();
    if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
        return NextResponse.json({ error: "API 키를 입력해주세요." }, { status: 400 });
    }

    const adminClient = getAdminClient();
    const { error: upsertError } = await adminClient
        .from("app_settings")
        .upsert(
            {
                key: "gemini_api_key",
                value: apiKey.trim(),
                updated_at: new Date().toISOString(),
                updated_by: user!.id,
            },
            { onConflict: "key" }
        );

    if (upsertError) {
        return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

// DELETE: API 키 삭제 (교사만 가능)
export async function DELETE() {
    const { authorized, status, error } = await verifyTeacher();
    if (!authorized) return NextResponse.json({ error }, { status });

    const adminClient = getAdminClient();
    const { error: deleteError } = await adminClient
        .from("app_settings")
        .delete()
        .eq("key", "gemini_api_key");

    if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
