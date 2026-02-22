import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";

export interface BulkStudent {
    name: string;
    studentNumber: string;
    email?: string;
}

export interface BulkResult {
    name: string;
    email: string;
    password: string;
    studentNumber: string;
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

    // 2. 요청 데이터 파싱
    const body = await req.json();
    const { students, classroomId }: { students: BulkStudent[]; classroomId: string } = body;

    if (!students || !Array.isArray(students) || students.length === 0) {
        return NextResponse.json({ error: "학생 데이터가 없습니다." }, { status: 400 });
    }

    if (!classroomId) {
        return NextResponse.json({ error: "학급을 선택해주세요." }, { status: 400 });
    }

    // 3. 학급 소유권 확인
    const { data: classroom } = await serverSupabase
        .from("classrooms")
        .select("id, name")
        .eq("id", classroomId)
        .eq("teacher_id", user.id)
        .single();

    if (!classroom) {
        return NextResponse.json({ error: "해당 학급을 찾을 수 없습니다." }, { status: 404 });
    }

    // 4. Service Role Key 확인
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error("Missing SUPABASE_SERVICE_ROLE_KEY or URL");
        return NextResponse.json(
            {
                error: "서버 환경 변수 설정 오류",
                details: "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다. .env.local 파일을 확인해주세요."
            },
            { status: 500 }
        );
    }

    // 5. 어드민 클라이언트 생성
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const results: BulkResult[] = [];

    for (const student of students) {
        const { name, studentNumber } = student;
        const email = student.email || `${studentNumber}@jobnavigator.com`;
        const password = `student${studentNumber}`;

        if (!name || !studentNumber) {
            results.push({ name: name || "이름 없음", email, password, studentNumber, success: false, error: "이름 또는 학번이 누락되었습니다." });
            continue;
        }

        if (password.length < 6) {
            results.push({ name, email, password, studentNumber, success: false, error: "학번이 너무 짧습니다 (최소 4자리 필요)." });
            continue;
        }

        try {
            // 5a. Auth 사용자 생성
            const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: {
                    name,
                    role: "student",
                    student_number: studentNumber,
                },
            });

            let userId: string;

            if (createError) {
                if (createError.message.includes("already been registered") || createError.message.includes("email_exists")) {
                    // 이미 등록된 사용자인 경우 ID 조회
                    const { data: existingProfile } = await adminClient
                        .from("profiles")
                        .select("id")
                        .eq("email", email)
                        .maybeSingle();

                    if (existingProfile) {
                        userId = existingProfile.id;
                    } else {
                        const { data: { users } } = await adminClient.auth.admin.listUsers();
                        const existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
                        if (existingUser) {
                            userId = existingUser.id;
                        } else {
                            results.push({ name, email, password, studentNumber, success: false, error: "중복된 이메일 계정 정보를 조회할 수 없습니다." });
                            continue;
                        }
                    }
                } else {
                    results.push({ name, email, password, studentNumber, success: false, error: createError.message });
                    continue;
                }
            } else {
                userId = userData.user.id;
            }

            // 5b. 프로필 upsert (student_number 포함)
            await adminClient.from("profiles").upsert(
                { id: userId, name, role: "student", email, student_number: studentNumber },
                { onConflict: "id" }
            );

            // 5c. 학급 멤버 추가
            const { error: memberError } = await adminClient
                .from("classroom_members")
                .upsert(
                    { classroom_id: classroomId, student_id: userId },
                    { onConflict: "classroom_id,student_id" }
                );

            if (memberError) {
                results.push({ name, email, password, studentNumber, success: false, error: `계정 생성됨 (학급 추가 실패: ${memberError.message})` });
            } else {
                results.push({ name, email, password, studentNumber, success: true });
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            results.push({ name, email, password, studentNumber, success: false, error: errorMessage });
        }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
        classroomName: classroom.name,
        total: students.length,
        successCount,
        failCount: students.length - successCount,
        results,
    });
}
