"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Trash2, Users, Plus } from "lucide-react";
import { toast } from "sonner";
import CreateClassroomModal from "@/components/teacher/CreateClassroomModal";

export default function TeacherSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [classrooms, setClassrooms] = useState<any[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");

    const supabase = createClient();

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
    }, []);

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success("참여 코드 복사됨");
    };

    const handleRename = async (classroomId: string) => {
        if (!editName.trim()) {
            toast.error("학급 이름을 입력해주세요.");
            return;
        }
        const { error } = await supabase
            .from("classrooms")
            .update({ name: editName.trim() })
            .eq("id", classroomId);

        if (error) {
            toast.error("수정 실패: " + error.message);
        } else {
            toast.success("학급 이름이 변경되었습니다.");
            setEditingId(null);
            setEditName("");
            loadClassrooms();
        }
    };

    const handleDeactivate = async (classroomId: string, currentActive: boolean) => {
        const action = currentActive ? "비활성화" : "활성화";
        const { error } = await supabase
            .from("classrooms")
            .update({ is_active: !currentActive })
            .eq("id", classroomId);

        if (error) {
            toast.error(`${action} 실패: ` + error.message);
        } else {
            toast.success(`학급이 ${action}되었습니다.`);
            loadClassrooms();
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
                <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setShowCreateModal(true)}>
                    <Plus className="mr-2 h-4 w-4" /> 새 학급 생성
                </Button>
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
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDeactivate(classroom.id, classroom.is_active)}
                                        >
                                            {classroom.is_active ? "비활성화" : "활성화"}
                                        </Button>
                                    </div>
                                </div>

                                {editingId === classroom.id ? (
                                    <div className="flex gap-2 mt-2">
                                        <Input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="flex-1"
                                            placeholder="새 학급 이름"
                                            onKeyDown={(e) => e.key === "Enter" && handleRename(classroom.id)}
                                        />
                                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => handleRename(classroom.id)}>저장</Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>취소</Button>
                                    </div>
                                ) : (
                                    <CardTitle
                                        className="text-lg cursor-pointer hover:text-purple-700 transition-colors"
                                        onClick={() => { setEditingId(classroom.id); setEditName(classroom.name); }}
                                        title="클릭하여 이름 수정"
                                    >
                                        {classroom.name}
                                    </CardTitle>
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
        </div>
    );
}
