"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { Send, Bot, User, Plus, Loader2, MessageCircle, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Message {
    role: "user" | "assistant";
    content: string;
    timestamp: string;
}

interface Session {
    id: string;
    title: string;
    created_at: string;
    messages: Message[];
}

export default function CounselingPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [apiKeySet, setApiKeySet] = useState<boolean | null>(null); // null = 로딩 중
    const [requested, setRequested] = useState(false);
    const [requestLoading, setRequestLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    useEffect(() => {
        loadSessions();
        // API 키 설정 여부 + 내 요청 상태 동시 확인
        Promise.all([
            fetch("/api/counseling").then(r => r.json()),
            fetch("/api/counseling/request").then(r => r.json()),
        ])
            .then(([statusData, requestData]) => {
                setApiKeySet(statusData.apiKeySet ?? false);
                setRequested(requestData.requested ?? false);
            })
            .catch(() => setApiKeySet(false));
    }, []);

    async function handleRequest() {
        setRequestLoading(true);
        try {
            if (requested) {
                await fetch("/api/counseling/request", { method: "DELETE" });
                setRequested(false);
            } else {
                await fetch("/api/counseling/request", { method: "POST" });
                setRequested(true);
            }
        } catch {
            // 실패해도 UI는 유지
        } finally {
            setRequestLoading(false);
        }
    }

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function loadSessions() {
        const { data } = await supabase
            .from("counseling_sessions")
            .select("id, title, created_at, messages")
            .order("updated_at", { ascending: false });
        setSessions(data || []);
        setLoadingSessions(false);
    }

    function startNewSession() {
        setCurrentSessionId(null);
        setMessages([]);
    }

    function openSession(session: Session) {
        setCurrentSessionId(session.id);
        setMessages(session.messages || []);
    }

    async function sendMessage() {
        const trimmed = input.trim();
        if (!trimmed || loading) return;

        const userMessage: Message = {
            role: "user",
            content: trimmed,
            timestamp: new Date().toISOString(),
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput("");
        setLoading(true);

        try {
            const res = await fetch("/api/counseling", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: updatedMessages,
                    sessionId: currentSessionId,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                if (data.limitType === "no_api_key") setApiKeySet(false);
                throw new Error(data.error);
            }

            const assistantMessage: Message = {
                role: "assistant",
                content: data.reply,
                timestamp: new Date().toISOString(),
            };

            setMessages([...updatedMessages, assistantMessage]);

            if (data.sessionId && !currentSessionId) {
                setCurrentSessionId(data.sessionId);
                loadSessions();
            }
        } catch (err: any) {
            setMessages([
                ...updatedMessages,
                {
                    role: "assistant",
                    content: "죄송합니다. 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
                    timestamp: new Date().toISOString(),
                },
            ]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] gap-4">
            {/* 세션 목록 사이드바 */}
            <div className="hidden md:flex w-64 flex-col gap-3">
                <Button
                    onClick={startNewSession}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                    <Plus className="h-4 w-4" />
                    새 상담 시작
                </Button>

                <div className="flex-1 overflow-y-auto space-y-2">
                    {loadingSessions ? (
                        <div className="flex justify-center pt-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : sessions.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground pt-4">
                            상담 기록이 없습니다
                        </p>
                    ) : (
                        sessions.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => openSession(s)}
                                className={cn(
                                    "w-full text-left rounded-lg px-3 py-2 text-sm transition-colors",
                                    currentSessionId === s.id
                                        ? "bg-blue-50 text-blue-700 font-medium"
                                        : "hover:bg-slate-100 text-slate-600"
                                )}
                            >
                                <p className="truncate font-medium">{s.title || "상담 세션"}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {new Date(s.created_at).toLocaleDateString("ko-KR")}
                                </p>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* 채팅 영역 */}
            <div className="flex-1 flex flex-col rounded-xl border bg-white shadow-sm overflow-hidden">
                {/* 헤더 */}
                <div className="flex items-center gap-3 border-b px-4 py-3 bg-blue-600">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                        <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <p className="font-semibold text-white text-sm">진로 AI 상담사</p>
                        <p className="text-xs text-blue-100">Gemini AI 기반 진로 상담</p>
                    </div>
                    <Button
                        onClick={startNewSession}
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-white hover:bg-white/20 gap-1 md:hidden"
                    >
                        <Plus className="h-4 w-4" />
                        새 상담
                    </Button>
                </div>

                {/* 메시지 목록 */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-muted-foreground">
                            <div className="rounded-full bg-blue-50 p-6">
                                <MessageCircle className="h-10 w-10 text-blue-400" />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-700">진로 AI 상담사</p>
                                <p className="text-sm mt-1">
                                    진로에 대한 고민이 있으신가요?<br />
                                    무엇이든 편하게 물어보세요! 😊
                                </p>
                            </div>
                            <div className="grid grid-cols-1 gap-2 w-full max-w-sm mt-2">
                                {[
                                    "나는 어떤 직업이 잘 맞을까요?",
                                    "이과와 문과 중 어떤 걸 선택해야 할까요?",
                                    "IT 분야에 관심이 있는데 어떻게 준비해야 하나요?",
                                ].map((q) => (
                                    <button
                                        key={q}
                                        onClick={() => {
                                            setInput(q);
                                        }}
                                        className="text-left rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 hover:bg-blue-100 transition-colors"
                                    >
                                        💬 {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        messages.map((msg, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "flex gap-3",
                                    msg.role === "user" ? "justify-end" : "justify-start"
                                )}
                            >
                                {msg.role === "assistant" && (
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                                        <Bot className="h-4 w-4 text-blue-600" />
                                    </div>
                                )}
                                <div
                                    className={cn(
                                        "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                                        msg.role === "user"
                                            ? "bg-blue-600 text-white rounded-tr-sm"
                                            : "bg-slate-100 text-slate-800 rounded-tl-sm"
                                    )}
                                >
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                    <p className={cn(
                                        "text-[10px] mt-1",
                                        msg.role === "user" ? "text-blue-200 text-right" : "text-slate-400"
                                    )}>
                                        {new Date(msg.timestamp).toLocaleTimeString("ko-KR", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                </div>
                                {msg.role === "user" && (
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600">
                                        <User className="h-4 w-4 text-white" />
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                    {loading && (
                        <div className="flex gap-3 justify-start">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                                <Bot className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
                                <div className="flex gap-1 items-center">
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* 입력창 */}
                <div className="border-t p-3">
                    {apiKeySet === false ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                                <LockKeyhole className="h-5 w-5 text-amber-500 shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-amber-700">현재 AI 상담을 이용할 수 없습니다</p>
                                    <p className="text-xs text-amber-600 mt-0.5">
                                        아래 버튼으로 선생님께 활성화를 요청할 수 있습니다.
                                    </p>
                                </div>
                            </div>
                            <Button
                                className={`w-full gap-2 ${requested
                                    ? "bg-green-100 text-green-700 hover:bg-green-200 border border-green-300"
                                    : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                                onClick={handleRequest}
                                disabled={requestLoading}
                                variant={requested ? "outline" : "default"}
                            >
                                {requestLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : requested ? (
                                    <>✅ 요청 완료 — 선생님 승인 대기 중 (취소하려면 클릭)</>
                                ) : (
                                    <>🙋 선생님께 AI 상담 활성화 요청하기</>
                                )}
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="flex gap-2">
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            sendMessage();
                                        }
                                    }}
                                    placeholder="진로 고민을 입력하세요... (Enter로 전송)"
                                    rows={2}
                                    className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                                />
                                <Button
                                    onClick={sendMessage}
                                    disabled={!input.trim() || loading}
                                    className="self-end bg-blue-600 hover:bg-blue-700 rounded-xl px-3"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                                AI 상담 내용은 선생님이 확인할 수 있습니다
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
