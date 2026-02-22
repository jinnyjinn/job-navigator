import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";

export interface CareerGuideEntry {
    studentNumber: string;
    guideContent: string;
    recommendedActivities: string;
    checklist: string;
}

export interface CareerGuideResult {
    studentNumber: string;
    studentName: string;
    success: boolean;
    error?: string;
}

export async function POST(req: NextRequest) {
    // 1. 인증된 교사인지 확인
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { data: profile } = await serverSupabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!profile || profile.role !== "teacher") {
        return NextResponse.json({ error: "교사 권한이 필요합니다." }, { status: 403 });
    }

    // 2. Service Role Key 확인
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return NextResponse.json({ error: "서버 환경 변수 설정 오류" }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3. 요청 데이터 파싱
    const body = await req.json();
    const { guides }: { guides: CareerGuideEntry[] } = body;

    if (!guides || !Array.isArray(guides) || guides.length === 0) {
        return NextResponse.json({ error: "가이드 데이터가 없습니다." }, { status: 400 });
    }

    // 4. student_number → profiles.id 일괄 조회
    const studentNumbers = [...new Set(guides.map((g) => g.studentNumber))];
    const { data: studentProfiles } = await adminClient
        .from("profiles")
        .select("id, student_number, name")
        .in("student_number", studentNumbers);

    const profileMap = new Map(
        (studentProfiles || []).map((p) => [p.student_number, p])
    );

    // 5. 진로 가이드를 teacher_feedbacks에 일괄 삽입
    const results: CareerGuideResult[] = [];

    for (const guide of guides) {
        const studentProfile = profileMap.get(guide.studentNumber);

        if (!studentProfile) {
            results.push({
                studentNumber: guide.studentNumber,
                studentName: "알 수 없음",
                success: false,
                error: `학번 ${guide.studentNumber}에 해당하는 학생을 찾을 수 없습니다. 먼저 학생 일괄 등록을 완료해주세요.`,
            });
            continue;
        }

        // 메시지 포맷: 진로 가이드 + 권장 활동 + 체크리스트
        const message = [
            `📋 진로 가이드`,
            ``,
            guide.guideContent,
            ``,
            `✅ 권장 활동`,
            guide.recommendedActivities,
            ``,
            `📌 체크리스트`,
            guide.checklist,
        ].join("\n");

        const { error } = await adminClient.from("teacher_feedbacks").insert({
            teacher_id: user.id,
            student_id: studentProfile.id,
            target_type: "all",
            feedback_type: "advice",
            message,
            is_read: false,
        });

        if (error) {
            results.push({
                studentNumber: guide.studentNumber,
                studentName: studentProfile.name,
                success: false,
                error: error.message,
            });
        } else {
            results.push({
                studentNumber: guide.studentNumber,
                studentName: studentProfile.name,
                success: true,
            });
        }
    }

    const successCount = results.filter((r) => r.success).length;
    return NextResponse.json({
        total: guides.length,
        successCount,
        failCount: guides.length - successCount,
        results,
    });
}
