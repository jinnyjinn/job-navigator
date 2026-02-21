"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Send, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const FEEDBACK_LABELS: Record<string, string> = {
    encouragement: "칭찬",
    improvement: "개선",
    advice: "조언",
};

export default function FeedbackPage() {
    const searchParams = useSearchParams();
    const preSelectedStudent = searchParams.get("student");

    const [selectedStudent, setSelectedStudent] = useState<string>(preSelectedStudent || "");
    const [feedbackType, setFeedbackType] = useState("encouragement");
    const [message, setMessage] = useState("");
    const [searchHistory, setSearchHistory] = useState("");
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);

    const [students, setStudents] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);

    const supabase = createClient();

    async function loadData() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 학급 목록 + 피드백 이력 병렬 조회
        const [classroomsResult, feedbackResult] = await Promise.all([
            supabase.from("classrooms").select("id, name").eq("teacher_id", user.id).eq("is_active", true),
            supabase
                .from("teacher_feedbacks")
                .select("id, student_id, feedback_type, message, is_read, created_at")
                .eq("teacher_id", user.id)
                .order("created_at", { ascending: false }),
        ]);

        const classroomIds = (classroomsResult.data || []).map((c: any) => c.id);
        let enrichedStudents: any[] = [];

        if (classroomIds.length > 0) {
            const { data: members } = await supabase
                .from("classroom_members")
                .select("classroom_id, student_id")
                .in("classroom_id", classroomIds);

            const studentIds = [...new Set((members || []).map((m: any) => m.student_id))];

            if (studentIds.length > 0) {
                const { data: profiles } = await supabase
                    .from("profiles")
                    .select("id, name")
                    .in("id", studentIds);

                enrichedStudents = (profiles || []).map((p: any) => {
                    const member = (members || []).find((m: any) => m.student_id === p.id);
                    const classroom = (classroomsResult.data || []).find((c: any) => c.id === member?.classroom_id);
                    return { ...p, classroom_name: classroom?.name || "" };
                });
            }
        }

        setStudents(enrichedStudents);

        // 피드백 이력에 학생 이름 매핑
        const historyWithNames = (feedbackResult.data || []).map((fb: any) => {
            const student = enrichedStudents.find((s: any) => s.id === fb.student_id);
            return { ...fb, student_name: student?.name || "알 수 없음" };
        });
        setHistory(historyWithNames);
        setLoading(false);
    }

    useEffect(() => {
        loadData();
    }, []);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent || !message.trim()) {
            toast.error("학생과 내용을 모두 입력해주세요.");
            return;
        }

        setSending(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from("teacher_feedbacks").insert({
            teacher_id: user.id,
            student_id: selectedStudent,
            target_type: "all",
            feedback_type: feedbackType,
            message: message.trim(),
            is_read: false,
        });

        if (error) {
            toast.error("피드백 전송 실패: " + error.message);
        } else {
            toast.success("피드백이 전송되었습니다.");
            setMessage("");
            // 이력 새로고침
            const { data: freshHistory } = await supabase
                .from("teacher_feedbacks")
                .select("id, student_id, feedback_type, message, is_read, created_at")
                .eq("teacher_id", user.id)
                .order("created_at", { ascending: false });

            if (freshHistory) {
                setHistory(
                    freshHistory.map((fb: any) => {
                        const student = students.find((s: any) => s.id === fb.student_id);
                        return { ...fb, student_name: student?.name || fb.student_id };
                    })
                );
            }
        }
        setSending(false);
    };

    const filteredHistory = history.filter((item) =>
        !searchHistory || (item.student_name || "").includes(searchHistory)
    );

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-2xl font-bold">피드백 관리</h1>

            <div className="grid gap-8 lg:grid-cols-5">
                {/* Left: Send Feedback Form */}
                <div className="lg:col-span-2">
                    <Card className="sticky top-6">
                        <CardHeader>
                            <CardTitle>새 피드백 보내기</CardTitle>
                            <CardDescription>학생에게 격려나 조언의 메시지를 보냅니다.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSend} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">받는 학생</label>
                                    {students.length === 0 ? (
                                        <p className="text-sm text-slate-400 p-2 border rounded-md">
                                            학급에 학생이 없습니다.
                                        </p>
                                    ) : (
                                        <Select onValueChange={setSelectedStudent} value={selectedStudent}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="학생 선택" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {students.map((s) => (
                                                    <SelectItem key={s.id} value={s.id}>
                                                        {s.name} {s.classroom_name ? `(${s.classroom_name})` : ""}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">피드백 유형</label>
                                    <div className="flex gap-2">
                                        {["encouragement", "improvement", "advice"].map((type) => (
                                            <Button
                                                key={type}
                                                type="button"
                                                variant={feedbackType === type ? "default" : "outline"}
                                                size="sm"
                                                className={
                                                    feedbackType === type
                                                        ? type === "encouragement"
                                                            ? "bg-green-600 hover:bg-green-700"
                                                            : type === "improvement"
                                                                ? "bg-orange-500 hover:bg-orange-600"
                                                                : "bg-blue-600 hover:bg-blue-700"
                                                        : ""
                                                }
                                                onClick={() => setFeedbackType(type)}
                                            >
                                                {type === "encouragement" ? "칭찬/격려" : type === "improvement" ? "개선점" : "조언"}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">메시지 내용</label>
                                    <textarea
                                        className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="학생에게 전할 말을 입력하세요..."
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-purple-600 hover:bg-purple-700"
                                    disabled={sending || students.length === 0}
                                >
                                    {sending ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="mr-2 h-4 w-4" />
                                    )}
                                    {sending ? "전송 중..." : "피드백 보내기"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: History */}
                <div className="lg:col-span-3">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>보낸 피드백 이력</span>
                                <div className="relative w-48">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                    <Input
                                        placeholder="이름 검색"
                                        className="pl-9 h-9"
                                        value={searchHistory}
                                        onChange={(e) => setSearchHistory(e.target.value)}
                                    />
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {filteredHistory.length === 0 ? (
                                <div className="text-center text-slate-400 py-10">
                                    <p>보낸 피드백이 없습니다.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredHistory.map((item) => (
                                        <div key={item.id} className="flex gap-4 p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                                            <Avatar className="h-10 w-10 border shrink-0">
                                                <AvatarFallback>{(item.student_name || "?")[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 space-y-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="font-semibold text-slate-900 truncate">
                                                        TO. {item.student_name}
                                                        <Badge
                                                            variant="outline"
                                                            className={`ml-2 text-xs ${
                                                                item.feedback_type === "encouragement"
                                                                    ? "text-green-600 border-green-200 bg-green-50"
                                                                    : item.feedback_type === "improvement"
                                                                        ? "text-orange-600 border-orange-200 bg-orange-50"
                                                                        : "text-blue-600 border-blue-200 bg-blue-50"
                                                            }`}
                                                        >
                                                            {FEEDBACK_LABELS[item.feedback_type] || item.feedback_type}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-xs text-slate-500 flex items-center gap-1 shrink-0">
                                                        {item.is_read ? (
                                                            <span className="text-green-600 flex items-center gap-0.5">
                                                                <CheckCircle2 className="h-3 w-3" /> 읽음
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400">읽지 않음</span>
                                                        )}
                                                        <span className="mx-1">·</span>
                                                        {new Date(item.created_at).toLocaleDateString("ko-KR")}
                                                    </div>
                                                </div>
                                                <p className="text-sm text-slate-600 leading-relaxed break-words">
                                                    {item.message}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
