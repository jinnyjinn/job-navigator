"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Bot, User, ChevronDown, ChevronUp, Loader2, MessageCircle } from "lucide-react";
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
    updated_at: string;
    messages: Message[];
    student: {
        id: string;
        name: string;
        student_number: string;
    };
}

export default function TeacherCounselingPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filterName, setFilterName] = useState("");
    const supabase = createClient();

    useEffect(() => {
        loadSessions();
    }, []);

    async function loadSessions() {
        const { data, error } = await supabase
            .from("counseling_sessions")
            .select(`
                id, title, created_at, updated_at, messages,
                student:profiles!counseling_sessions_student_id_fkey(id, name, student_number)
            `)
            .order("updated_at", { ascending: false });

        if (!error && data) {
            setSessions(data as any);
        }
        setLoading(false);
    }

    const filtered = sessions.filter((s) => {
        const name = s.student?.name || "";
        return name.includes(filterName);
    });

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">AI 상담 내역</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    학생들의 AI 진로 상담 기록을 확인하세요
                </p>
            </div>

            {/* 검색 */}
            <input
                type="text"
                placeholder="학생 이름으로 검색..."
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
            />

            {/* 통계 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <p className="text-xs text-muted-foreground">총 상담 세션</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">{sessions.length}</p>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <p className="text-xs text-muted-foreground">상담 참여 학생</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">
                        {new Set(sessions.map((s) => s.student?.id)).size}
                    </p>
                </div>
                <div className="rounded-xl border bg-white p-4 shadow-sm col-span-2 md:col-span-1">
                    <p className="text-xs text-muted-foreground">총 대화 수</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                        {sessions.reduce((acc, s) => acc + (s.messages?.length || 0), 0)}
                    </p>
                </div>
            </div>

            {/* 세션 목록 */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-muted-foreground">
                    <MessageCircle className="h-10 w-10 mb-3 text-slate-300" />
                    <p className="font-medium">아직 AI 상담 기록이 없습니다</p>
                    <p className="text-sm mt-1">학생들이 상담을 시작하면 여기에 표시됩니다</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((session) => (
                        <div key={session.id} className="rounded-xl border bg-white shadow-sm overflow-hidden">
                            {/* 세션 헤더 */}
                            <button
                                onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-3 text-left">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 shrink-0">
                                        <User className="h-4 w-4 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800 text-sm">
                                            {session.student?.name || "알 수 없음"}
                                            <span className="text-muted-foreground font-normal ml-2 text-xs">
                                                ({session.student?.student_number}번)
                                            </span>
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate max-w-xs">
                                            {session.title || "상담 세션"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(session.updated_at).toLocaleDateString("ko-KR")}
                                    </span>
                                    <span className="text-xs bg-purple-100 text-purple-700 rounded-full px-2 py-0.5">
                                        {session.messages?.length || 0}개 메시지
                                    </span>
                                    {expandedId === session.id ? (
                                        <ChevronUp className="h-4 w-4 text-slate-400" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4 text-slate-400" />
                                    )}
                                </div>
                            </button>

                            {/* 대화 내용 */}
                            {expandedId === session.id && (
                                <div className="border-t bg-slate-50 px-4 py-3 space-y-3 max-h-96 overflow-y-auto">
                                    {(session.messages || []).map((msg, i) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                "flex gap-2",
                                                msg.role === "user" ? "justify-end" : "justify-start"
                                            )}
                                        >
                                            {msg.role === "assistant" && (
                                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 mt-0.5">
                                                    <Bot className="h-3 w-3 text-blue-600" />
                                                </div>
                                            )}
                                            <div
                                                className={cn(
                                                    "max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed",
                                                    msg.role === "user"
                                                        ? "bg-purple-100 text-purple-900"
                                                        : "bg-white border text-slate-700"
                                                )}
                                            >
                                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                                <p className="text-[10px] text-muted-foreground mt-1">
                                                    {new Date(msg.timestamp).toLocaleTimeString("ko-KR", {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </p>
                                            </div>
                                            {msg.role === "user" && (
                                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 mt-0.5">
                                                    <User className="h-3 w-3 text-purple-600" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
