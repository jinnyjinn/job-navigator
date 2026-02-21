"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { XPProgress } from "@/components/dashboard/XPProgress";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import { CertificationsList } from "@/components/profile/CertificationsList";
import { SkillsRadar } from "@/components/profile/SkillsRadar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare, Loader2, BookOpen, Trophy } from "lucide-react";
import Link from "next/link";
import { calculateProgress } from "@/utils/gamification";
import { getTimeAgo } from "@/utils/time";

export default function StudentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const studentId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [studentProfile, setStudentProfile] = useState<any>(null);
    const [activityLogs, setActivityLogs] = useState<any[]>([]);
    const [recentQuests, setRecentQuests] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);

    const supabase = createClient();

    useEffect(() => {
        async function loadStudentData() {
            if (!studentId) return;

            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            // 프로필, 활동로그, 퀘스트, 프로젝트 병렬 조회
            const [profileResult, logsResult, questsResult, projectsResult] = await Promise.all([
                supabase.from("profiles").select("*").eq("id", studentId).single(),
                supabase
                    .from("activity_logs")
                    .select("created_at")
                    .eq("user_id", studentId)
                    .gte("created_at", ninetyDaysAgo.toISOString()),
                supabase
                    .from("daily_quests")
                    .select("id, content, category, is_completed, xp_earned, quest_date")
                    .eq("user_id", studentId)
                    .order("quest_date", { ascending: false })
                    .limit(10),
                supabase
                    .from("projects")
                    .select("id, title, category, tech_tags, created_at")
                    .eq("user_id", studentId)
                    .order("created_at", { ascending: false })
                    .limit(6),
            ]);

            setStudentProfile(profileResult.data);

            if (logsResult.data) {
                const dateMap: Record<string, number> = {};
                logsResult.data.forEach((log: any) => {
                    const date = new Date(log.created_at).toISOString().split("T")[0];
                    dateMap[date] = (dateMap[date] || 0) + 1;
                });
                setActivityLogs(Object.entries(dateMap).map(([date, count]) => ({ date, count })));
            }

            setRecentQuests(questsResult.data || []);
            setProjects(projectsResult.data || []);
            setLoading(false);
        }

        loadStudentData();
    }, [studentId]);

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!studentProfile) {
        return (
            <div className="p-8 text-center text-slate-400">
                <p>학생 정보를 찾을 수 없습니다.</p>
                <Button variant="ghost" className="mt-4" onClick={() => router.back()}>
                    돌아가기
                </Button>
            </div>
        );
    }

    const questCategoryLabel: Record<string, string> = {
        study: "학습",
        cert: "자격증",
        project: "프로젝트",
        self: "자기계발",
        etc: "기타",
    };

    const projectCategoryLabel: Record<string, string> = {
        class: "수업",
        project: "프로젝트",
        contest: "대회",
        intern: "인턴",
        cert: "자격증",
        volunteer: "봉사",
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-2xl font-bold">{studentProfile.name} 학생 상세</h1>
                <div className="ml-auto">
                    <Link href={`/teacher/feedback?student=${studentId}`}>
                        <Button className="bg-purple-600 hover:bg-purple-700">
                            <MessageSquare className="mr-2 h-4 w-4" /> 피드백 보내기
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Profile + Stats */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>프로필</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        <div className="w-24 h-24 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-purple-700">
                            {(studentProfile.name || "?")[0]}
                        </div>
                        <h2 className="text-xl font-bold">{studentProfile.name || "이름 없음"}</h2>
                        <p className="text-slate-500 text-sm mt-1">
                            {studentProfile.school_name || "학교 미입력"}
                            {studentProfile.grade && ` · ${studentProfile.grade}학년`}
                        </p>
                        {studentProfile.desired_job && (
                            <Badge variant="outline" className="mt-2 text-slate-600">
                                희망직무: {studentProfile.desired_job}
                            </Badge>
                        )}
                        {studentProfile.bio && (
                            <p className="mt-4 text-sm text-slate-600 bg-slate-50 rounded-lg p-3 text-left">
                                "{studentProfile.bio}"
                            </p>
                        )}
                        <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-2 text-center">
                            <div>
                                <p className="text-lg font-bold text-purple-700">{studentProfile.total_xp || 0}</p>
                                <p className="text-xs text-slate-400">총 XP</p>
                            </div>
                            <div>
                                <p className="text-lg font-bold text-orange-500">{studentProfile.streak_days || 0}</p>
                                <p className="text-xs text-slate-400">연속 학습일</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white p-4 rounded-xl border shadow-sm">
                        <h3 className="font-semibold text-slate-800 mb-3">성장 현황</h3>
                        <XPProgress totalXP={studentProfile.total_xp || 0} streak={studentProfile.streak_days || 0} />
                    </div>
                    <div className="bg-white p-4 rounded-xl border shadow-sm">
                        <h3 className="font-semibold text-slate-800 mb-3">학습 활동 (최근 3개월)</h3>
                        <ActivityHeatmap activityLogs={activityLogs} />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="quests" className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
                    <TabsTrigger value="quests">퀘스트</TabsTrigger>
                    <TabsTrigger value="portfolio">포트폴리오</TabsTrigger>
                    <TabsTrigger value="certs">자격증</TabsTrigger>
                    <TabsTrigger value="skills">스킬</TabsTrigger>
                </TabsList>

                {/* 퀘스트 탭 */}
                <TabsContent value="quests" className="pt-4">
                    {recentQuests.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 border rounded-lg bg-slate-50">
                            <BookOpen className="mx-auto mb-2 h-8 w-8 opacity-40" />
                            <p>퀘스트 내역이 없습니다.</p>
                            <p className="text-xs mt-1">(teacher_read_policies.sql 적용 후 활성화됩니다)</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentQuests.map((quest: any) => (
                                <div key={quest.id} className="flex items-center gap-4 p-4 border rounded-lg bg-white hover:bg-slate-50">
                                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${quest.is_completed ? "bg-green-500" : "bg-slate-300"}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium ${quest.is_completed ? "line-through text-slate-400" : "text-slate-800"}`}>
                                            {quest.content}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">{quest.quest_date}</p>
                                    </div>
                                    <Badge variant="outline" className="text-xs shrink-0">
                                        {questCategoryLabel[quest.category] || quest.category}
                                    </Badge>
                                    {quest.is_completed && (
                                        <Badge className="bg-green-100 text-green-700 text-xs shrink-0">
                                            +{quest.xp_earned} XP
                                        </Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* 포트폴리오 탭 */}
                <TabsContent value="portfolio" className="pt-4">
                    {projects.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 border rounded-lg bg-slate-50">
                            <Trophy className="mx-auto mb-2 h-8 w-8 opacity-40" />
                            <p>포트폴리오 항목이 없습니다.</p>
                            <p className="text-xs mt-1">(teacher_read_policies.sql 적용 후 활성화됩니다)</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {projects.map((project: any) => (
                                <div key={project.id} className="border rounded-xl p-4 bg-white hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge variant="outline" className="text-xs">
                                            {projectCategoryLabel[project.category] || project.category}
                                        </Badge>
                                        <span className="text-xs text-slate-400">{new Date(project.created_at).toLocaleDateString("ko-KR")}</span>
                                    </div>
                                    <h4 className="font-semibold text-slate-800 mb-2">{project.title}</h4>
                                    {project.tech_tags && project.tech_tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {project.tech_tags.slice(0, 3).map((tag: string) => (
                                                <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                                    {tag}
                                                </span>
                                            ))}
                                            {project.tech_tags.length > 3 && (
                                                <span className="text-xs text-slate-400">+{project.tech_tags.length - 3}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="certs" className="pt-4">
                    <CertificationsList userId={studentId} />
                </TabsContent>

                <TabsContent value="skills" className="pt-4">
                    <SkillsRadar userId={studentId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
