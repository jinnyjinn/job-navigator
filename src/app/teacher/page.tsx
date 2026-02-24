"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Plus, Copy, Users, TrendingUp, AlertCircle, MessageSquare,
    Bell, User, School, Calendar, Loader2, LogOut
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { calculateProgress } from "@/utils/gamification";
import { getTimeAgo, getStudentStatus } from "@/utils/time";
import CreateClassroomModal from "@/components/teacher/CreateClassroomModal";

import { useRouter } from "next/navigation";

export default function TeacherDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [teacherProfile, setTeacherProfile] = useState<any>(null);
    const [classrooms, setClassrooms] = useState<any[]>([]);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [recentActivities, setRecentActivities] = useState<any[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const supabase = createClient();

    async function loadDashboard() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. 교사 프로필 + 학급 목록 병렬 조회
        const [profileResult, classroomsResult] = await Promise.all([
            supabase.from("profiles").select("name, school_name, major, avatar_url").eq("id", user.id).single(),
            supabase.from("classrooms").select("id, name, grade, class_number, join_code").eq("teacher_id", user.id).eq("is_active", true),
        ]);

        setTeacherProfile(profileResult.data);
        const classroomsData = classroomsResult.data || [];

        if (classroomsData.length === 0) {
            setLoading(false);
            return;
        }

        // 2. 전체 학급 멤버 조회
        const classroomIds = classroomsData.map((c: any) => c.id);
        const { data: members } = await supabase
            .from("classroom_members")
            .select("classroom_id, student_id")
            .in("classroom_id", classroomIds);

        // 3. 학생 프로필 조회 (public read)
        const studentIds = [...new Set((members || []).map((m: any) => m.student_id))];
        const { data: studentProfiles } = studentIds.length > 0
            ? await supabase.from("profiles").select("id, name, total_xp, level, last_active_date").in("id", studentIds)
            : { data: [] };

        // 4. 학급별 통계 계산
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const classroomsWithStats = classroomsData.map((classroom: any) => {
            const classMembers = (members || []).filter((m: any) => m.classroom_id === classroom.id);
            const classStudentIds = classMembers.map((m: any) => m.student_id);
            const classStudents = (studentProfiles || []).filter((p: any) => classStudentIds.includes(p.id));

            const activeStudents = classStudents.filter((s: any) =>
                s.last_active_date && new Date(s.last_active_date) > sevenDaysAgo
            );

            const avgLevel = classStudents.length > 0
                ? classStudents.reduce((sum: number, s: any) => sum + (s.level || 1), 0) / classStudents.length
                : 0;

            const avgXp = classStudents.length > 0
                ? classStudents.reduce((sum: number, s: any) => sum + (s.total_xp || 0), 0) / classStudents.length
                : 0;

            return {
                ...classroom,
                student_count: classStudents.length,
                active_weekly: activeStudents.length,
                avg_level: parseFloat(avgLevel.toFixed(1)),
                avg_attainment: Math.round(calculateProgress(avgXp)),
            };
        });
        setClassrooms(classroomsWithStats);

        // 5. 비활성 학생 알림 (7일 이상)
        const inactiveStudents = (studentProfiles || [])
            .filter((s: any) => {
                if (!s.last_active_date) return true;
                return new Date(s.last_active_date) < sevenDaysAgo;
            })
            .map((s: any) => {
                const member = (members || []).find((m: any) => m.student_id === s.id);
                const classroom = classroomsData.find((c: any) => c.id === member?.classroom_id);
                const daysInactive = s.last_active_date
                    ? Math.floor((Date.now() - new Date(s.last_active_date).getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                return {
                    id: s.id,
                    student: s.name || "이름 없음",
                    class: classroom?.name || "알 수 없음",
                    days_inactive: daysInactive,
                    reason: daysInactive ? `${daysInactive}일째 미접속` : "접속 기록 없음",
                };
            });
        setAlerts(inactiveStudents.slice(0, 5));

        // 6. 최근 학생 활동 (activity_logs - teacher_read_policies.sql 적용 필요)
        if (studentIds.length > 0) {
            const { data: recentLogs } = await supabase
                .from("activity_logs")
                .select("user_id, activity_type, created_at")
                .in("user_id", studentIds)
                .order("created_at", { ascending: false })
                .limit(10);

            if (recentLogs && recentLogs.length > 0) {
                const activityTypeLabel: Record<string, string> = {
                    login: "접속",
                    quest_completion: "퀘스트 완료",
                    code_commit: "코드 커밋",
                    daily_challenge: "일일 챌린지",
                };
                const activities = recentLogs.map((log: any) => {
                    const student = (studentProfiles || []).find((p: any) => p.id === log.user_id);
                    return {
                        id: log.user_id + log.created_at,
                        student: student?.name || "알 수 없음",
                        action: activityTypeLabel[log.activity_type] || log.activity_type,
                        time: getTimeAgo(log.created_at),
                    };
                });
                setRecentActivities(activities);
            }
        }

        setLoading(false);
    }

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            window.location.href = "/auth";
        } catch (error) {
            console.error("Logout error:", error);
            window.location.href = "/auth";
        }
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success("참여 코드 복사 완료");
    };

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {/* Header / Profile Section */}
            <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-purple-100">
                        <AvatarImage src={teacherProfile?.avatar_url} />
                        <AvatarFallback className="bg-purple-100 text-purple-700">
                            <User className="h-8 w-8" />
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            {teacherProfile?.name || "선생님"} 선생님
                        </h1>
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                            <School className="h-4 w-4" />
                            <span>
                                {teacherProfile?.school_name || "학교 미입력"}
                                {teacherProfile?.major && ` · ${teacherProfile.major}`}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" /> 로그아웃
                    </Button>
                    <Link href="/teacher/feedback">
                        <Button variant="outline">
                            <MessageSquare className="mr-2 h-4 w-4" /> 메시지
                        </Button>
                    </Link>
                    <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setShowCreateModal(true)}>
                        <Plus className="mr-2 h-4 w-4" /> 새 학급 생성
                    </Button>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (2/3): Classrooms & Activity */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-600" /> 운영 중인 학급
                    </h2>

                    {classrooms.length === 0 ? (
                        <div className="border border-dashed rounded-xl p-10 text-center text-slate-400">
                            <Users className="mx-auto mb-3 h-8 w-8 opacity-40" />
                            <p className="font-medium">운영 중인 학급이 없습니다.</p>
                            <p className="text-sm mt-1">새 학급을 생성해 학생들을 초대해보세요.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {classrooms.map((c) => (
                                <Card key={c.id} className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <Badge variant="outline" className="mb-2">
                                                {c.grade}학년 {c.class_number}반
                                            </Badge>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-slate-400"
                                                onClick={() => copyCode(c.join_code)}
                                            >
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <CardTitle className="text-lg">{c.name}</CardTitle>
                                        <CardDescription className="flex items-center gap-1 mt-1">
                                            참여 코드: <code className="font-bold text-purple-700">{c.join_code}</code>
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pb-4">
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">평균 달성률</span>
                                                <span className="font-bold text-purple-700">{c.avg_attainment}%</span>
                                            </div>
                                            <Progress value={c.avg_attainment} className="h-2" />
                                            <div className="flex justify-between items-center text-sm pt-2 border-t">
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-slate-400">학생 수</span>
                                                    <span className="font-semibold">{c.student_count}명</span>
                                                </div>
                                                <div className="flex flex-col text-center">
                                                    <span className="text-xs text-slate-400">주간 활성</span>
                                                    <span className="font-semibold">{c.active_weekly}명</span>
                                                </div>
                                                <div className="flex flex-col text-right">
                                                    <span className="text-xs text-slate-400">평균 레벨</span>
                                                    <span className="font-semibold">Lv. {c.avg_level}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Recent Student Activity Feed */}
                    <div className="bg-white rounded-xl border p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-blue-500" /> 최근 학생 활동
                        </h3>
                        {recentActivities.length === 0 ? (
                            <p className="text-center text-slate-400 text-sm py-6">
                                최근 활동 내역이 없습니다.
                                <br />
                                <span className="text-xs">(teacher_read_policies.sql 적용 후 활성화됩니다)</span>
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {recentActivities.map((activity) => (
                                    <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                                        <div className="bg-blue-100 p-2 rounded-full text-blue-600 mt-1">
                                            <Bell className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm">
                                                <span className="font-bold text-slate-800">{activity.student}</span> 학생이{" "}
                                                <span className="font-medium text-slate-600">{activity.action}</span>을(를) 했습니다.
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="mt-4 text-center">
                            <Link href="/teacher/students" className="text-sm text-purple-600 hover:underline">
                                전체 학생 활동 보기 →
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Right Column (1/3): Alerts & Quick Actions */}
                <div className="space-y-6">
                    {/* Action Needed */}
                    <Card className="border-rose-200 bg-rose-50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-rose-700 flex items-center gap-2 text-lg">
                                <AlertCircle className="h-5 w-5" /> 주의 필요
                            </CardTitle>
                            <CardDescription className="text-rose-600/80">
                                7일 이상 활동이 없는 학생입니다.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {alerts.length === 0 ? (
                                <p className="text-center text-sm text-rose-400 py-2">비활성 학생이 없습니다 👍</p>
                            ) : (
                                <div className="space-y-3">
                                    {alerts.map((alert) => (
                                        <div key={alert.id} className="bg-white p-3 rounded-lg border border-rose-100 shadow-sm flex justify-between items-center">
                                            <div>
                                                <div className="font-bold text-slate-800">{alert.student}</div>
                                                <div className="text-xs text-slate-500">{alert.class}</div>
                                            </div>
                                            <Badge variant="destructive" className="bg-rose-500 hover:bg-rose-600 text-xs">
                                                {alert.reason}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <Link href="/teacher/feedback">
                                <Button className="w-full mt-4 bg-rose-600 hover:bg-rose-700 text-white" size="sm">
                                    격려 메시지 보내기
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Quick Menu */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">빠른 메뉴</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-2">
                            <Link href="/teacher/students" className="block">
                                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200">
                                    <Users className="h-6 w-6" />
                                    <span>학생 관리</span>
                                </Button>
                            </Link>
                            <Link href="/teacher/feedback" className="block">
                                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200">
                                    <MessageSquare className="h-6 w-6" />
                                    <span>피드백</span>
                                </Button>
                            </Link>
                            <Link href="/teacher/settings" className="block">
                                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200">
                                    <Calendar className="h-6 w-6" />
                                    <span>학급 설정</span>
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Create Classroom Modal */}
            {showCreateModal && (
                <CreateClassroomModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => {
                        setShowCreateModal(false);
                        loadDashboard();
                    }}
                />
            )}
        </div>
    );
}
