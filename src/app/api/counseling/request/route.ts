import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// GET: 내 요청 상태 확인
export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data } = await supabase
        .from("counseling_requests")
        .select("id, created_at")
        .eq("student_id", user.id)
        .maybeSingle();

    return NextResponse.json({ requested: !!data, createdAt: data?.created_at ?? null });
}

// POST: 요청 보내기 (이미 있으면 upsert)
export async function POST() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase
        .from("counseling_requests")
        .upsert({ student_id: user.id }, { onConflict: "student_id" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}

// DELETE: 요청 취소
export async function DELETE() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase
        .from("counseling_requests")
        .delete()
        .eq("student_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
