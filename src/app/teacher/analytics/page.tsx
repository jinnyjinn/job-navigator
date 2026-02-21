"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";
import { Loader2, Users, TrendingUp, Award, BookOpen } from "lucide-react";
import { calculateLevel, calculateProgress } from "@/utils/gamification";

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#6366f1"];

const CATEGORY_LABELS: Record<string, string> = {
    study: "학습",
    cert: "자격증",
    project: "프로젝트",
    self: "자기계발",
    etc: "기타",
};

export default function AnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [classrooms, setClassrooms] = useState<any[]>([]);
    const [selectedClassroom, setSelectedClassroom] = useState<string>("all");
    const [stats, setStats] = useState({
        totalStudents: 0,
        activeStudents: 0,
        avgLevel: 0,
        avgXP: 0,
        totalQuests: 0,
        completedQuests: 0,
    });
    const [levelDistribution, setLevelDistribution] = useState<any[]>([]);
    const [questCategoryData, setQuestCategoryData] = useState<any[]>([]);
    const [weeklyActivity, setWeeklyActivity] = useState<any[]>([]);
    const [studentRankings, setStudentRankings] = useState<any[]>([]);

    const supabase = createClient();

    async function loadAnalytics(classroomFilter?: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 내 학급 조회
        const { data: classroomsData } = await supabase
            .from("classrooms")
            .select("id, name, grade, class_number")
            .eq("teacher_id", user.id)
            .eq("is_active", true);

        setClassrooms(classroomsData || []);

        const classroomIds = (classroomsData || []).map((c: any) => c.id);
        if (classroomIds.length === 0) {
            setLoading(false);
            return;
        }

        // 학급 필터링
        const targetClassroomIds = classroomFilter && classroomFilter !== "all"
            ? [classroomFilter]
            : classroomIds;

        // 멤버 조회
        const { data: members } = await supabase
            .from("classroom_members")
            .select("student_id")
            .in("classroom_id", targetClassroomIds);

        const studentIds = [...new Set((members || []).map((m: any) => m.student_id))];

        if (studentIds.length === 0) {
            setLoading(false);
            return;
        }

        // 학생 프로필 조회
        const { data: profiles } = await supabase
            .from("profiles")
            .select("id, name, total_xp, level, last_active_date, streak_days")
            .in("id", studentIds);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const activeStudents = (profiles || []).filter((p: any) =>
            p.last_active_date && new Date(p.last_active_date) > sevenDaysAgo
        );

        const totalXP = (profiles || []).reduce((sum: number, p: any) => sum + (p.total_xp || 0), 0);
        const avgLevel = profiles && profiles.length > 0
            ? (profiles || []).reduce((sum: number, p: any) => sum + (p.level || 1), 0) / profiles.length
            : 0;

        // 레벨 분포
        const levelMap: Record<number, number> = {};
        (profiles || []).forEach((p: any) => {
            const lvl = p.level || 1;
            levelMap[lvl] = (levelMap[lvl] || 0) + 1;
        });
        const levelDist = Object.entries(levelMap)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([level, count]) => ({ level: `Lv.${level}`, count }));
        setLevelDistribution(levelDist);

        // 퀘스트 통계 (teacher_read_policies.sql 적용 후 활성화)
        const { data: quests } = await supabase
            .from("daily_quests")
            .select("category, is_completed")
            .in("user_id", studentIds);

        const questCatMap: Record<string, { total: number; completed: number }> = {};
        (quests || []).forEach((q: any) => {
            const cat = q.category || "etc";
            if (!questCatMap[cat]) questCatMap[cat] = { total: 0, completed: 0 };
            questCatMap[cat].total++;
            if (q.is_completed) questCatMap[cat].completed++;
        });

        const questCatData = Object.entries(questCatMap).map(([cat, data]) => ({
            name: CATEGORY_LABELS[cat] || cat,
            완료: data.completed,
            미완료: data.total - data.completed,
        }));
        setQuestCategoryData(questCatData);

        // 주간 활동 (최근 7일)
        const { data: activityLogs } = await supabase
            .from("activity_logs")
            .select("created_at")
            .in("user_id", studentIds)
            .gte("created_at", sevenDaysAgo.toISOString());

        const dayMap: Record<string, number> = {};
        const days = ["일", "월", "화", "수", "목", "금", "토"];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split("T")[0];
            dayMap[key] = 0;
        }
        (activityLogs || []).forEach((log: any) => {
            const dateKey = new Date(log.created_at).toISOString().split("T")[0];
            if (dateKey in dayMap) dayMap[dateKey]++;
        });
        const weeklyData = Object.entries(dayMap).map(([date, count]) => ({
            date: `${days[new Date(date).getDay()]}(${date.slice(5)})`,
            활동수: count,
        }));
        setWeeklyActivity(weeklyData);

        // 학생 랭킹 (XP 기준)
        const rankings = [...(profiles || [])]
            .sort((a: any, b: any) => (b.total_xp || 0) - (a.total_xp || 0))
            .slice(0, 10)
            .map((p: any, i: number) => ({
                rank: i + 1,
                name: p.name || "이름 없음",
                xp: p.total_xp || 0,
                level: p.level || 1,
                streak: p.streak_days || 0,
            }));
        setStudentRankings(rankings);

        setStats({
            totalStudents: studentIds.length,
            activeStudents: activeStudents.length,
            avgLevel: parseFloat(avgLevel.toFixed(1)),
            avgXP: profiles && profiles.length > 0 ? Math.round(totalXP / profiles.length) : 0,
            totalQuests: (quests || []).length,
            completedQuests: (quests || []).filter((q: any) => q.is_completed).length,
        });

        setLoading(false);
    }

    useEffect(() => {
        loadAnalytics();
    }, []);

    const handleClassroomChange = (value: string) => {
        setSelectedClassroom(value);
        setLoading(true);
        loadAnalytics(value);
    };

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const questCompletionRate = stats.totalQuests > 0
        ? Math.round((stats.completedQuests / stats.totalQuests) * 100)
        : 0;

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold">데이터 분석</h1>
                    <p className="text-slate-500 text-sm mt-1">학생들의 학습 현황을 분석합니다.</p>
                </div>
                <select
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={selectedClassroom}
                    onChange={(e) => handleClassroomChange(e.target.value)}
                >
                    <option value="all">전체 학급</option>
                    {classrooms.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-purple-100 p-2">
                                <Users className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{stats.totalStudents}</p>
                                <p className="text-xs text-slate-500">전체 학생</p>
                            </div>
                        </div>
                        <div className="mt-3 text-xs text-slate-500">
                            이번 주 활성: <span className="font-semibold text-green-600">{stats.activeStudents}명</span>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-blue-100 p-2">
                                <TrendingUp className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">Lv.{stats.avgLevel}</p>
                                <p className="text-xs text-slate-500">평균 레벨</p>
                            </div>
                        </div>
                        <div className="mt-3 text-xs text-slate-500">
                            평균 XP: <span className="font-semibold text-blue-600">{stats.avgXP.toLocaleString()}</span>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-green-100 p-2">
                                <BookOpen className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{stats.totalQuests}</p>
                                <p className="text-xs text-slate-500">총 퀘스트 수</p>
                            </div>
                        </div>
                        <div className="mt-3 text-xs text-slate-500">
                            완료율: <span className="font-semibold text-green-600">{questCompletionRate}%</span>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-orange-100 p-2">
                                <Award className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{stats.completedQuests}</p>
                                <p className="text-xs text-slate-500">완료된 퀘스트</p>
                            </div>
                        </div>
                        <div className="mt-3 text-xs text-slate-500">
                            미완료: <span className="font-semibold text-rose-500">{stats.totalQuests - stats.completedQuests}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* 레벨 분포 */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">레벨 분포</CardTitle>
                        <CardDescription>학생들의 레벨 현황</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {levelDistribution.length === 0 ? (
                            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">데이터 없음</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={levelDistribution}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="level" tick={{ fontSize: 12 }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#8b5cf6" name="학생 수" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* 주간 활동 */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">주간 활동 추이</CardTitle>
                        <CardDescription>최근 7일 학생 활동 수 (teacher_read_policies.sql 적용 필요)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {weeklyActivity.length === 0 ? (
                            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">데이터 없음</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={weeklyActivity}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="활동수" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* 퀘스트 카테고리별 */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-base">퀘스트 카테고리별 현황</CardTitle>
                        <CardDescription>카테고리별 완료/미완료 퀘스트 수</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {questCategoryData.length === 0 ? (
                            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                                데이터 없음 (teacher_read_policies.sql 적용 필요)
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={questCategoryData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="완료" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="미완료" fill="#f1f5f9" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 학생 랭킹 */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Award className="h-4 w-4 text-yellow-500" /> 학생 XP 랭킹 (상위 10명)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {studentRankings.length === 0 ? (
                        <div className="text-center text-slate-400 py-8 text-sm">학생 데이터 없음</div>
                    ) : (
                        <div className="space-y-2">
                            {studentRankings.map((student) => (
                                <div key={student.rank} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                                        ${student.rank === 1 ? "bg-yellow-100 text-yellow-700" :
                                          student.rank === 2 ? "bg-slate-200 text-slate-700" :
                                          student.rank === 3 ? "bg-orange-100 text-orange-700" :
                                          "bg-slate-100 text-slate-500"}`}>
                                        {student.rank}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-800 truncate">{student.name}</p>
                                        <p className="text-xs text-slate-500">Lv.{student.level} · 연속 {student.streak}일</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-bold text-purple-700">{student.xp.toLocaleString()} XP</p>
                                        <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden mt-1">
                                            <div
                                                className="h-full bg-purple-500 rounded-full"
                                                style={{ width: `${Math.round(calculateProgress(student.xp))}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
