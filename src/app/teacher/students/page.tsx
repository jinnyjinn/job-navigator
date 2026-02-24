"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, LayoutGrid, List as ListIcon, MoreHorizontal, Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { calculateProgress } from "@/utils/gamification";
import { getTimeAgo, getStudentStatus } from "@/utils/time";

export default function StudentManagementPage() {
    const router = useRouter();
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [search, setSearch] = useState("");
    const [selectedClassroom, setSelectedClassroom] = useState("all");
    const [loading, setLoading] = useState(true);

    const [classrooms, setClassrooms] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);

    const supabase = createClient();

    useEffect(() => {
        async function loadData() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. 내 학급 조회
            const { data: classroomsData } = await supabase
                .from("classrooms")
                .select("id, name, grade, class_number")
                .eq("teacher_id", user.id)
                .eq("is_active", true);

            setClassrooms(classroomsData || []);
            if (!classroomsData || classroomsData.length === 0) {
                setLoading(false);
                return;
            }

            // 2. 학급 멤버 조회
            const classroomIds = classroomsData.map((c: any) => c.id);
            const { data: members } = await supabase
                .from("classroom_members")
                .select("classroom_id, student_id")
                .in("classroom_id", classroomIds);

            // 3. 학생 프로필 조회
            const studentIds = [...new Set((members || []).map((m: any) => m.student_id))];
            if (studentIds.length === 0) {
                setLoading(false);
                return;
            }

            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, name, total_xp, level, last_active_date, avatar_url")
                .in("id", studentIds);

            // 4. 학생 + 학급 정보 합치기
            const enrichedStudents = (profiles || []).map((profile: any) => {
                const member = (members || []).find((m: any) => m.student_id === profile.id);
                const classroom = classroomsData.find((c: any) => c.id === member?.classroom_id);
                const status = getStudentStatus(profile.last_active_date);
                return {
                    ...profile,
                    classroom_id: member?.classroom_id,
                    classroom_name: classroom?.name || "알 수 없음",
                    progress: Math.round(calculateProgress(profile.total_xp || 0)),
                    lastActive: getTimeAgo(profile.last_active_date),
                    status,
                };
            });

            setStudents(enrichedStudents);
            setLoading(false);
        }

        loadData();
    }, []);

    const filteredStudents = students.filter((s) => {
        const matchesSearch = !search || (s.name || "").includes(search);
        const matchesClass = selectedClassroom === "all" || s.classroom_id === selectedClassroom;
        return matchesSearch && matchesClass;
    });

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold">학생 관리</h1>
                    <p className="text-slate-500">전체 학생 명단 및 학습 현황을 조회합니다.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/teacher/students/bulk-import")}
                        className="gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50"
                    >
                        <UserPlus className="h-4 w-4" /> 일괄 등록
                    </Button>
                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                    <Button
                        variant={viewMode === "grid" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("grid")}
                        className={cn(viewMode === "grid" && "bg-white shadow-sm")}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={viewMode === "list" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className={cn(viewMode === "list" && "bg-white shadow-sm")}
                    >
                        <ListIcon className="h-4 w-4" />
                    </Button>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                        placeholder="이름 검색..."
                        className="pl-9 w-full"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <select
                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full sm:w-[220px]"
                        value={selectedClassroom}
                        onChange={(e) => setSelectedClassroom(e.target.value)}
                    >
                        <option value="all">전체 학급</option>
                        {classrooms.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {filteredStudents.length === 0 && (
                <div className="text-center text-slate-400 py-16 border border-dashed rounded-xl">
                    <p className="font-medium">표시할 학생이 없습니다.</p>
                    <p className="text-sm mt-1">학생이 학급 참여 코드로 가입하면 여기에 표시됩니다.</p>
                </div>
            )}

            {/* Grid View */}
            {viewMode === "grid" && filteredStudents.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredStudents.map((student) => (
                        <div key={student.id} className="relative group">
                            <Link href={`/teacher/students/${student.id}`} className="absolute inset-0 z-10" />
                            <Card className="h-full hover:border-purple-300 transition-all hover:shadow-md cursor-pointer overflow-hidden">
                                {student.status === "inactive" && (
                                    <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] px-2 py-1 rounded-bl-lg font-bold z-20">
                                        주의 필요
                                    </div>
                                )}
                                <CardContent className="pt-6 flex flex-col items-center text-center">
                                    <Avatar className="h-20 w-20 mb-4 border-4 border-slate-50 group-hover:border-purple-50 transition-colors">
                                        <AvatarImage src={student.avatar_url || ""} alt={student.name || ""} />
                                        <AvatarFallback className="bg-slate-100 text-slate-600 text-xl font-bold">
                                            {(student.name || "?")[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <h3 className="font-bold text-lg mb-1">{student.name || "이름 없음"}</h3>
                                    <p className="text-sm text-slate-500 mb-2">{student.classroom_name}</p>
                                    <Badge variant="secondary" className="mb-4 bg-purple-50 text-purple-700 hover:bg-purple-100">
                                        Lv.{student.level || 1}
                                    </Badge>

                                    <div className="w-full space-y-1.5 text-left mt-auto">
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>레벨 진척도</span>
                                            <span className="font-medium">{student.progress}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                                                style={{ width: `${student.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-slate-50/50 py-3 px-4 text-xs text-slate-500 flex justify-between items-center border-t">
                                    <span className="flex items-center gap-1.5">
                                        <span className={cn("w-1.5 h-1.5 rounded-full",
                                            student.status === "online" ? "bg-green-500" :
                                            student.status === "active" ? "bg-blue-400" :
                                            student.status === "inactive" ? "bg-rose-500" : "bg-slate-300"
                                        )} />
                                        {student.lastActive}
                                    </span>
                                    <MoreHorizontal className="h-4 w-4 text-slate-400" />
                                </CardFooter>
                            </Card>
                        </div>
                    ))}
                </div>
            )}

            {/* List View */}
            {viewMode === "list" && filteredStudents.length > 0 && (
                <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 p-4 border-b bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wider">
                        <div className="col-span-4 sm:col-span-3">학생 정보</div>
                        <div className="col-span-3 sm:col-span-2 text-center">레벨</div>
                        <div className="col-span-3 sm:col-span-4">레벨 진척도</div>
                        <div className="col-span-2 sm:col-span-2 text-right">최근 활동</div>
                        <div className="col-span-1 text-center">상세</div>
                    </div>
                    {filteredStudents.map((student) => (
                        <div key={student.id} className="grid grid-cols-12 gap-4 p-4 items-center border-b last:border-0 hover:bg-slate-50 transition-colors group">
                            <div className="col-span-4 sm:col-span-3 flex items-center gap-3">
                                <Avatar className="h-9 w-9 border">
                                    <AvatarImage src={student.avatar_url || ""} alt={student.name || ""} />
                                    <AvatarFallback className="text-xs">{(student.name || "?")[0]}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <Link href={`/teacher/students/${student.id}`} className="font-medium text-slate-900 hover:text-purple-700 hover:underline truncate block">
                                        {student.name || "이름 없음"}
                                    </Link>
                                    <div className="text-xs text-slate-500 truncate">{student.classroom_name}</div>
                                </div>
                            </div>
                            <div className="col-span-3 sm:col-span-2 text-center">
                                <Badge variant="outline" className="font-normal text-slate-600 border-slate-200">
                                    Lv.{student.level || 1}
                                </Badge>
                            </div>
                            <div className="col-span-3 sm:col-span-4 flex items-center gap-3">
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${student.progress}%` }} />
                                </div>
                                <span className="text-xs font-medium text-slate-600 w-8">{student.progress}%</span>
                            </div>
                            <div className="col-span-2 sm:col-span-2 text-right text-sm text-slate-500">
                                {student.lastActive}
                            </div>
                            <div className="col-span-1 flex justify-center">
                                <Link href={`/teacher/students/${student.id}`}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreHorizontal className="h-4 w-4 text-slate-400" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
