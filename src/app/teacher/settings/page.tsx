"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Trash2, Users, Plus, Pencil, Settings2, KeyRound, Eye, EyeOff, CheckCircle2, XCircle, BellRing, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import CreateClassroomModal from "@/components/teacher/CreateClassroomModal";

export default function TeacherSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [classrooms, setClassrooms] = useState<any[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editGrade, setEditGrade] = useState<number>(1);
    const [editClassNumber, setEditClassNumber] = useState<number>(1);

    // AI 상담 API 키 관련 상태
    const [apiKeyInput, setApiKeyInput] = useState("");
    const [showApiKey, setShowApiKey] = useState(false);
    const [apiKeyStatus, setApiKeyStatus] = useState<{ isSet: boolean; updatedAt: string | null } | null>(null);
    const [apiKeyLoading, setApiKeyLoading] = useState(false);

    // AI 상담 요청 학생 목록
    const [counselingRequests, setCounselingRequests] = useState<any[]>([]);
    const [requestsLoading, setRequestsLoading] = useState(false);

    const supabase = createClient();
    const router = useRouter();

    async function loadClassrooms() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: classroomsData } = await supabase
            .from("classrooms")
            .select("id, name, grade, class_number, join_code, is_active, created_at")
            .eq("teacher_id", user.id)
            .order("created_at", { ascending: false });

        // 각 학급의 학생 수 조회
        const classroomsWithCount = await Promise.all(
            (classroomsData || []).map(async (c: any) => {
                const { count } = await supabase
                    .from("classroom_members")
                    .select("*", { count: "exact", head: true })
                    .eq("classroom_id", c.id);
                return { ...c, student_count: count || 0 };
            })
        );

        setClassrooms(classroomsWithCount);
        setLoading(false);
    }

    useEffect(() => {
        loadClassrooms();
        loadApiKeyStatus();
        loadCounselingRequests();
        const timer = setInterval(loadClassrooms, 5 * 60 * 1000);
        return () => clearInterval(timer);
    }, []);

    async function loadApiKeyStatus() {
        const res = await fetch("/api/teacher/api-settings");
        if (res.ok) {
            const data = await res.json();
            setApiKeyStatus(data);
        }
    }

    async function loadCounselingRequests() {
        setRequestsLoading(true);
        try {
            const res = await fetch("/api/teacher/counseling-requests");
            if (res.ok) {
                const data = await res.json();
                setCounselingRequests(data.requests || []);
            }
        } catch {
            // 조용히 실패
        } finally {
            setRequestsLoading(false);
        }
    }

    async function handleSaveApiKey() {
        if (!apiKeyInput.trim()) {
            toast.error("API 키를 입력해주세요.");
            return;
        }
        setApiKeyLoading(true);
        try {
            const res = await fetch("/api/teacher/api-settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ apiKey: apiKeyInput.trim() }),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            toast.success("Gemini API 키가 저장되었습니다. 학생 AI 상담이 활성화됩니다.");
            setApiKeyInput("");
            setShowApiKey(false);
            await loadApiKeyStatus();
        } catch (err: any) {
            toast.error("저장 실패", { description: err.message });
        } finally {
            setApiKeyLoading(false);
        }
    }

    async function handleDeleteApiKey() {
        if (!confirm("API 키를 삭제하면 학생들이 AI 상담을 사용할 수 없게 됩니다.\n정말 삭제하시겠습니까?")) return;
        setApiKeyLoading(true);
        try {
            const res = await fetch("/api/teacher/api-settings", { method: "DELETE" });
            if (!res.ok) throw new Error((await res.json()).error);
            toast.success("API 키가 삭제되었습니다. AI 상담이 비활성화됩니다.");
            await loadApiKeyStatus();
        } catch (err: any) {
            toast.error("삭제 실패", { description: err.message });
        } finally {
            setApiKeyLoading(false);
        }
    }

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success("참여 코드 복사됨");
    };

    const handleUpdate = async (classroomId: string) => {
        if (!editName.trim()) {
            toast.error("학급 이름을 입력해주세요.");
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("classrooms")
                .update({
                    name: editName.trim(),
                    grade: editGrade,
                    class_number: editClassNumber
                })
                .eq("id", classroomId)
                .select();

            if (error) throw error;

            if (!data || data.length === 0) {
                // RLS 정책에 의해 차단된 경우 에러 발생
                throw new Error("수정 권한이 없거나 대상을 찾을 수 없습니다. (DB 정책 확인 필요)");
            }

            toast.success("학급 정보가 수정되었습니다.");
            setEditingId(null);

            await loadClassrooms();
            router.refresh();
        } catch (error: any) {
            console.error("Update Error:", error);
            toast.error("수정 실패", { description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleDeactivate = async (classroomId: string, currentActive: boolean) => {
        const action = currentActive ? "비활성화" : "활성화";
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("classrooms")
                .update({ is_active: !currentActive })
                .eq("id", classroomId)
                .select();

            if (error) throw error;

            if (!data || data.length === 0) {
                throw new Error("권한이 없거나 대상을 찾을 수 없어 상태 변경에 실패했습니다.");
            }

            toast.success(`학급이 ${action}되었습니다.`);
            await loadClassrooms();
            router.refresh();
        } catch (error: any) {
            toast.error(`${action} 실패`, { description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (classroomId: string, className: string) => {
        if (!confirm(`'${className}' 학급을 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며, 모든 학생 기록과의 연결이 끊어질 수 있습니다.`)) {
            return;
        }

        setLoading(true);

        // 낙관적 업데이트: 서버 응답 전 화면에서 즉시 제거
        setClassrooms(prev => prev.filter(c => c.id !== classroomId));

        try {
            const { data, error } = await supabase
                .from("classrooms")
                .delete()
                .eq("id", classroomId)
                .select();

            if (error) throw error;

            if (!data || data.length === 0) {
                // 삭제 실패 시 데이터 복구 및 알림
                await loadClassrooms();
                throw new Error("삭제 권한이 없거나 이미 삭제된 대상입니다.");
            }

            toast.success("학급이 삭제되었습니다.");
            // 데이터 재호출 및 경로 새로고침
            await loadClassrooms();
            router.refresh();
        } catch (error: any) {
            console.error("Delete Error:", error);
            toast.error("삭제 실패", { description: error.message });
            await loadClassrooms(); // 에러 발생 시 원복
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">학급 설정</h1>
                    <p className="text-slate-500 text-sm mt-1">학급을 관리하고 참여 코드를 확인합니다.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => loadClassrooms()} disabled={loading}>
                        <Loader2 className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                        새로고침
                    </Button>
                    <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setShowCreateModal(true)}>
                        <Plus className="mr-2 h-4 w-4" /> 새 학급 생성
                    </Button>
                </div>
            </div>

            {classrooms.length === 0 ? (
                <div className="border border-dashed rounded-xl p-16 text-center text-slate-400">
                    <Users className="mx-auto mb-3 h-10 w-10 opacity-40" />
                    <p className="font-medium">생성된 학급이 없습니다.</p>
                    <p className="text-sm mt-1">새 학급을 생성해 학생들을 초대해보세요.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {classrooms.map((classroom) => (
                        <Card key={classroom.id} className={classroom.is_active ? "" : "opacity-60"}>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between gap-4 flex-wrap">
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline">{classroom.grade}학년 {classroom.class_number}반</Badge>
                                        {!classroom.is_active && (
                                            <Badge variant="secondary" className="text-xs">비활성</Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-slate-400 hover:text-red-600"
                                            onClick={() => handleDelete(classroom.id, classroom.name)}
                                            title="학급 삭제"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDeactivate(classroom.id, classroom.is_active)}
                                        >
                                            {classroom.is_active ? "비활성화" : "활성화"}
                                        </Button>
                                    </div>
                                </div>

                                {editingId === classroom.id ? (
                                    <div className="space-y-3 mt-4 p-4 border rounded-lg bg-slate-50">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 ml-1">학급 이름</label>
                                                <Input
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="bg-white"
                                                    placeholder="새 학급 이름"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 ml-1">학년</label>
                                                <select
                                                    className="w-full h-10 rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                    value={editGrade}
                                                    onChange={(e) => setEditGrade(Number(e.target.value))}
                                                >
                                                    <option value={1}>1학년</option>
                                                    <option value={2}>2학년</option>
                                                    <option value={3}>3학년</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 ml-1">반</label>
                                                <Input
                                                    type="number"
                                                    value={editClassNumber}
                                                    onChange={(e) => setEditClassNumber(Number(e.target.value))}
                                                    className="bg-white"
                                                    min={1}
                                                    max={20}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>취소</Button>
                                            <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => handleUpdate(classroom.id)}>수정 완료</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between mt-2">
                                        <CardTitle className="text-lg">
                                            {classroom.name}
                                        </CardTitle>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-slate-400 hover:text-purple-600"
                                            onClick={() => {
                                                setEditingId(classroom.id);
                                                setEditName(classroom.name);
                                                setEditGrade(classroom.grade);
                                                setEditClassNumber(classroom.class_number);
                                            }}
                                        >
                                            <Pencil className="h-4 w-4 mr-2" />
                                            수정하기
                                        </Button>
                                    </div>
                                )}

                                <CardDescription>
                                    생성일: {new Date(classroom.created_at).toLocaleDateString("ko-KR")}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <div className="flex items-center gap-6 text-sm">
                                        <div>
                                            <span className="text-slate-400 text-xs block">학생 수</span>
                                            <span className="font-bold text-slate-800">{classroom.student_count}명</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 text-xs block">참여 코드</span>
                                            <div className="flex items-center gap-2">
                                                <code className="font-bold text-purple-700 text-base tracking-widest">
                                                    {classroom.join_code}
                                                </code>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-slate-400 hover:text-purple-600"
                                                    onClick={() => copyCode(classroom.join_code)}
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {showCreateModal && (
                <CreateClassroomModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => {
                        setShowCreateModal(false);
                        loadClassrooms();
                    }}
                />
            )}

            {/* AI 상담 API 키 설정 */}
            <Card className="border-2 border-purple-100">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                            <KeyRound className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-lg">AI 상담 API 키 설정</CardTitle>
                                {counselingRequests.length > 0 && (
                                    <Badge className="bg-red-500 text-white text-xs px-2 py-0.5 animate-pulse">
                                        {counselingRequests.length}명 요청
                                    </Badge>
                                )}
                            </div>
                            <CardDescription>
                                Gemini API 키를 등록하면 학생들이 AI 진로 상담을 이용할 수 있습니다.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* 학생 요청 현황 */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BellRing className="h-4 w-4 text-amber-500" />
                                <span className="text-sm font-medium text-slate-700">학생 AI 상담 요청 현황</span>
                                {counselingRequests.length > 0 && (
                                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                                        {counselingRequests.length}명 대기 중
                                    </Badge>
                                )}
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={loadCounselingRequests}
                                disabled={requestsLoading}
                                className="text-slate-400 hover:text-slate-600 h-7 px-2"
                            >
                                <RefreshCw className={cn("h-3.5 w-3.5", requestsLoading && "animate-spin")} />
                            </Button>
                        </div>

                        {requestsLoading ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        ) : counselingRequests.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-center">
                                <p className="text-xs text-slate-400">현재 AI 상담을 요청한 학생이 없습니다</p>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 divide-y divide-amber-100 max-h-48 overflow-y-auto">
                                {counselingRequests.map((req: any) => {
                                    const p = req.profiles;
                                    return (
                                        <div key={req.id} className="flex items-center justify-between px-3 py-2 text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-200 shrink-0">
                                                    <span className="text-xs font-bold text-amber-700">
                                                        {p?.name?.[0] ?? "?"}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-slate-800">{p?.name ?? "이름 없음"}</span>
                                                    {p?.grade && p?.class_name && (
                                                        <span className="ml-1.5 text-xs text-slate-500">
                                                            {p.grade}학년 {p.class_name}반
                                                            {p?.student_id && ` · ${p.student_id}번`}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="text-xs text-slate-400 shrink-0 ml-2">
                                                {new Date(req.created_at).toLocaleDateString("ko-KR", {
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {counselingRequests.length > 0 && (
                            <p className="text-xs text-amber-600">
                                💡 API 키를 등록하면 위 학생들이 즉시 AI 상담을 이용할 수 있습니다.
                            </p>
                        )}
                    </div>

                    {/* 현재 상태 표시 */}
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border">
                        {apiKeyStatus?.isSet ? (
                            <>
                                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-green-700">API 키 등록됨 — 학생 AI 상담 활성화 중</p>
                                    {apiKeyStatus.updatedAt && (
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            마지막 업데이트: {new Date(apiKeyStatus.updatedAt).toLocaleString("ko-KR")}
                                        </p>
                                    )}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 border-red-200 hover:bg-red-50 shrink-0"
                                    onClick={handleDeleteApiKey}
                                    disabled={apiKeyLoading}
                                >
                                    {apiKeyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                                    키 삭제
                                </Button>
                            </>
                        ) : (
                            <>
                                <XCircle className="h-5 w-5 text-slate-400 shrink-0" />
                                <p className="text-sm text-slate-500">API 키 미등록 — 학생 AI 상담 비활성화 상태</p>
                            </>
                        )}
                    </div>

                    {/* API 키 입력 */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                            {apiKeyStatus?.isSet ? "새 API 키로 교체" : "Gemini API 키 입력"}
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    type={showApiKey ? "text" : "password"}
                                    value={apiKeyInput}
                                    onChange={(e) => setApiKeyInput(e.target.value)}
                                    placeholder="AIzaSy..."
                                    className="pr-10"
                                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveApiKey(); }}
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                >
                                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <Button
                                className="bg-purple-600 hover:bg-purple-700 shrink-0"
                                onClick={handleSaveApiKey}
                                disabled={apiKeyLoading || !apiKeyInput.trim()}
                            >
                                {apiKeyLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                                {apiKeyStatus?.isSet ? "교체" : "저장"}
                            </Button>
                        </div>
                        <p className="text-xs text-slate-400">
                            Google AI Studio에서 발급받은 Gemini API 키를 입력하세요.{" "}
                            <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-600 hover:underline"
                            >
                                API 키 발급 받기 →
                            </a>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
