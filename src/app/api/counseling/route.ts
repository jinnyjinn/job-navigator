import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `당신은 고등학생들의 진로 탐색을 돕는 친절하고 따뜻한 AI 상담 선생님입니다.
학생들의 고민을 경청하고, 다음과 같은 역할을 해주세요:

1. 학생의 흥미, 적성, 가치관을 파악하는 질문을 해주세요
2. 다양한 진로와 직업에 대한 정보를 알기 쉽게 설명해주세요
3. 학생이 스스로 결정을 내릴 수 있도록 도와주세요
4. 부드럽고 격려하는 언어를 사용해주세요
5. 한국 교육 시스템과 취업 시장을 고려한 현실적인 조언을 해주세요

응답은 간결하고 친근하게 해주세요. 전문 용어보다는 학생이 이해하기 쉬운 표현을 사용해주세요.`;

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { messages, sessionId } = await req.json();

        // Gemini 모델 초기화
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: SYSTEM_PROMPT,
        });

        // 대화 히스토리 구성 (Gemini 형식)
        const history = messages.slice(0, -1).map((msg: { role: string; content: string }) => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }],
        }));

        const chat = model.startChat({ history });

        // 마지막 유저 메시지 전송
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
                    .update({
                        messages: updatedMessages,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", sessionId)
                    .eq("student_id", user.id);
            } else {
                // 첫 메시지면 제목을 첫 질문으로 설정
                const title = lastMessage.content.slice(0, 50) + (lastMessage.content.length > 50 ? "..." : "");
                const { data: newSession } = await supabase
                    .from("counseling_sessions")
                    .insert({
                        student_id: user.id,
                        messages: updatedMessages,
                        title,
                    })
                    .select("id")
                    .single();
                savedSessionId = newSession?.id ?? null;
            }
        } catch (dbError) {
            console.warn("counseling_sessions 저장 실패 (테이블 미생성일 수 있음):", dbError);
        }

        return NextResponse.json({ reply: responseText, sessionId: savedSessionId });
    } catch (error: any) {
        console.error("Counseling API error:", error);
        return NextResponse.json(
            { error: error.message || "AI 응답 생성 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
