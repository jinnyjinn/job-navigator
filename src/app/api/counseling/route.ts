import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// ── 사용 한도 설정 ──
const MAX_QUESTIONS_PER_SESSION = 2; // 세션당 최대 질문 수
const MAX_SESSIONS_PER_STUDENT = 1;  // 학생당 최대 세션 수
const MAX_TOTAL_QUESTIONS = 50;      // 전체 최대 질문 수 (모든 학생 합산)

const SYSTEM_PROMPT = `당신은 고등학생들의 진로 탐색을 돕는 친절하고 따뜻한 AI 상담 선생님입니다.
학생들의 고민을 경청하고, 다음과 같은 역할을 해주세요:

1. 학생의 흥미, 적성, 가치관을 파악하는 질문을 해주세요
2. 다양한 진로와 직업에 대한 정보를 알기 쉽게 설명해주세요
3. 학생이 스스로 결정을 내릴 수 있도록 도와주세요
4. 부드럽고 격려하는 언어를 사용해주세요
5. 한국 교육 시스템과 취업 시장을 고려한 현실적인 조언을 해주세요

응답은 간결하고 친근하게 해주세요. 전문 용어보다는 학생이 이해하기 쉬운 표현을 사용해주세요.`;

// admin 클라이언트 (RLS 우회용)
function getAdminClient() {
    return createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

// DB에서 Gemini API 키 조회
async function getGeminiApiKey(): Promise<string | null> {
    const admin = getAdminClient();
    const { data } = await admin
        .from("app_settings")
        .select("value")
        .eq("key", "gemini_api_key")
        .maybeSingle();
    return data?.value ?? null;
}

// 전체 질문 수 합산 헬퍼
async function getTotalQuestions(supabase: Awaited<ReturnType<typeof createClient>>) {
    const { data: allSessions } = await supabase
        .from("counseling_sessions")
        .select("messages");

    let total = 0;
    for (const session of allSessions || []) {
        total += (session.messages || []).filter((m: { role: string }) => m.role === "user").length;
    }
    return total;
}

// GET: 현재 사용량 및 API 키 설정 여부 조회
export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [apiKey, totalQuestions] = await Promise.all([
        getGeminiApiKey(),
        getTotalQuestions(supabase),
    ]);

    const { count: studentSessionCount } = await supabase
        .from("counseling_sessions")
        .select("id", { count: "exact", head: true })
        .eq("student_id", user.id);

    return NextResponse.json({
        apiKeySet: !!apiKey,
        totalQuestions,
        maxTotalQuestions: MAX_TOTAL_QUESTIONS,
        studentSessions: studentSessionCount ?? 0,
        maxStudentSessions: MAX_SESSIONS_PER_STUDENT,
        maxQuestionsPerSession: MAX_QUESTIONS_PER_SESSION,
        globalLimitReached: totalQuestions >= MAX_TOTAL_QUESTIONS,
        studentLimitReached: (studentSessionCount ?? 0) >= MAX_SESSIONS_PER_STUDENT,
    });
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { messages, sessionId } = await req.json();

        // ── API 키 확인 (DB에서 조회) ──
        const apiKey = await getGeminiApiKey();
        if (!apiKey) {
            return NextResponse.json({
                error: "현재 AI 상담을 이용할 수 없습니다. 선생님께 문의해주세요.",
                limitType: "no_api_key",
            }, { status: 503 });
        }

        // ── 한도 체크 1: 전체 질문 수 (50개 초과 시 차단) ──
        const totalQuestions = await getTotalQuestions(supabase);
        if (totalQuestions >= MAX_TOTAL_QUESTIONS) {
            return NextResponse.json({
                error: `전체 AI 상담 질문 한도(${MAX_TOTAL_QUESTIONS}개)에 도달했습니다. 선생님께 문의하세요.`,
                limitType: "global",
            }, { status: 429 });
        }

        // ── 한도 체크 2: 학생당 세션 수 (새 세션 시작 시에만 체크) ──
        if (!sessionId) {
            const { count: existingCount } = await supabase
                .from("counseling_sessions")
                .select("id", { count: "exact", head: true })
                .eq("student_id", user.id);

            if ((existingCount ?? 0) >= MAX_SESSIONS_PER_STUDENT) {
                return NextResponse.json({
                    error: `1인당 ${MAX_SESSIONS_PER_STUDENT}번의 상담 세션만 허용됩니다.`,
                    limitType: "session",
                }, { status: 429 });
            }
        }

        // ── 한도 체크 3: 세션당 질문 수 (2개 초과 시 차단) ──
        const userMessageCount = messages.filter((m: { role: string }) => m.role === "user").length;
        if (userMessageCount > MAX_QUESTIONS_PER_SESSION) {
            return NextResponse.json({
                error: `세션당 최대 ${MAX_QUESTIONS_PER_SESSION}번의 질문만 허용됩니다.`,
                limitType: "message",
            }, { status: 429 });
        }

        // ── Gemini API 호출 (DB에서 읽어온 키 사용) ──
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: SYSTEM_PROMPT,
        });

        const history = messages.slice(0, -1).map((msg: { role: string; content: string }) => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }],
        }));

        const chat = model.startChat({ history });
        const lastMessage = messages[messages.length - 1];
        const result = await chat.sendMessage(lastMessage.content);
        const responseText = result.response.text();

        // Supabase에 세션 저장 (실패해도 AI 응답은 반환)
        const updatedMessages = [
            ...messages,
            { role: "assistant", content: responseText, timestamp: new Date().toISOString() },
        ];

        let savedSessionId: string | null = sessionId ?? null;

        try {
            if (sessionId) {
                await supabase
                    .from("counseling_sessions")
                    .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
                    .eq("id", sessionId)
                    .eq("student_id", user.id);
            } else {
                const title = lastMessage.content.slice(0, 50) + (lastMessage.content.length > 50 ? "..." : "");
                const { data: newSession } = await supabase
                    .from("counseling_sessions")
                    .insert({ student_id: user.id, messages: updatedMessages, title })
                    .select("id")
                    .single();
                savedSessionId = newSession?.id ?? null;
            }
        } catch (dbError) {
            console.warn("counseling_sessions 저장 실패:", dbError);
        }

        return NextResponse.json({
            reply: responseText,
            sessionId: savedSessionId,
            usage: {
                totalQuestions: totalQuestions + 1,
                maxTotalQuestions: MAX_TOTAL_QUESTIONS,
                userMessagesInSession: userMessageCount,
                maxQuestionsPerSession: MAX_QUESTIONS_PER_SESSION,
                remainingInSession: MAX_QUESTIONS_PER_SESSION - userMessageCount,
                remainingGlobal: MAX_TOTAL_QUESTIONS - totalQuestions - 1,
            },
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "AI 응답 생성 중 오류가 발생했습니다.";
        console.error("Counseling API error:", error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
