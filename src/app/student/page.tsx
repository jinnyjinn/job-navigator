"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { XPProgress } from "@/components/dashboard/XPProgress";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import { ProfileCard } from "@/components/dashboard/ProfileCard";
import { DDayCounter } from "@/components/dashboard/DDayCounter";
import { QuestPreview } from "@/components/dashboard/QuestPreview";
import { Loader2, BotMessageSquare } from "lucide-react";
import Link from "next/link";

export default function StudentPage() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [activityLogs, setActivityLogs] = useState<any[]>([]);

    const supabase = createClient();

    useEffect(() => {
        async function loadDashboardData() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 프로필 & 활동 로그 병렬 조회
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            const [profileResult, logsResult] = await Promise.all([
                supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .single(),
                supabase
                    .from("activity_logs")
                    .select("created_at")
                    .eq("user_id", user.id)
                    .gte("created_at", ninetyDaysAgo.toISOString()),
            ]);

            setProfile(profileResult.data);

            if (logsResult.data) {
                const dateMap: Record<string, number> = {};
                logsResult.data.forEach((log) => {
                    const date = new Date(log.created_at).toISOString().split("T")[0];
                    dateMap[date] = (dateMap[date] || 0) + 1;
                });
                setActivityLogs(
                    Object.entries(dateMap).map(([date, count]) => ({ date, count }))
                );
            }

            setLoading(false);
        }

        loadDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <section>
                <ProfileCard profile={profile} />
            </section>

            <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="col-span-full lg:col-span-1">
                    <div className="rounded-xl border bg-white p-6 shadow-sm h-full">
                        <h3 className="mb-4 font-semibold text-slate-800">성장 현황</h3>
                        <XPProgress totalXP={profile?.total_xp || 0} streak={profile?.streak_days || 0} />
                    </div>
                </div>
                <div className="col-span-full md:col-span-1 lg:col-span-1">
                    <DDayCounter />
                </div>
                <div className="col-span-full md:col-span-1 lg:col-span-1">
                    <QuestPreview />
                </div>
                <div className="col-span-full md:col-span-1 lg:col-span-1">
                    <Link href="/student/counseling" className="block h-full">
                        <div className="group relative h-full overflow-hidden rounded-xl border-none bg-gradient-to-br from-purple-500 to-indigo-600 p-6 text-white shadow-lg transition-all hover:shadow-xl">
                            <div className="relative z-10 flex h-full flex-col justify-between">
                                <div>
                                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                        <BotMessageSquare className="h-6 w-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold">AI 진로 상담</h3>
                                    <p className="mt-2 text-sm text-purple-100 italic">
                                        "오늘의 진로 고민을 AI 선생님과 나누어보세요."
                                    </p>
                                </div>
                                <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-white/90">
                                    상담 시작하기 <span className="transition-transform group-hover:translate-x-1">→</span>
                                </div>
                            </div>
                            {/* Decorative background circle */}
                            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl transition-transform group-hover:scale-150" />
                        </div>
                    </Link>
                </div>
            </section>

            <section className="grid gap-6 md:grid-cols-3">
                <div className="col-span-full md:col-span-2">
                    <div className="rounded-xl border bg-white p-6 shadow-sm">
                        <h3 className="mb-4 font-semibold text-slate-800">학습 활동 (최근 3개월)</h3>
                        <ActivityHeatmap activityLogs={activityLogs} />
                    </div>
                </div>
                <div className="col-span-full md:col-span-1">
                    <RecentFeedbackPanel userId={profile?.id} />
                </div>
            </section>
        </div>
    );
}

function RecentFeedbackPanel({ userId }: { userId?: string }) {
    const [feedbacks, setFeedbacks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        if (!userId) return;
        async function load() {
            const { data } = await supabase
                .from("teacher_feedbacks")
                .select("id, feedback_type, message, created_at, is_read")
                .eq("student_id", userId)
                .order("created_at", { ascending: false })
                .limit(5);
            setFeedbacks(data || []);
            setLoading(false);

            // 읽지 않은 피드백 읽음 처리
            const unreadIds = (data || [])
                .filter((fb) => !fb.is_read)
                .map((fb) => fb.id);
            if (unreadIds.length > 0) {
                await supabase
                    .from("teacher_feedbacks")
                    .update({ is_read: true })
                    .in("id", unreadIds);
            }
        }
        load();
    }, [userId]);

    const typeLabel: Record<string, string> = {
        encouragement: "🌟 칭찬",
        improvement: "📝 개선",
        advice: "💡 조언",
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center rounded-xl border p-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (feedbacks.length === 0) {
        return (
            <div className="flex h-full flex-col justify-center items-center rounded-xl border border-dashed p-6 text-center text-muted-foreground">
                <div className="mb-2 rounded-full bg-slate-100 p-3">
                    <span className="text-xl">🔔</span>
                </div>
                <p className="text-sm font-medium">최근 활동 & 피드백</p>
                <p className="text-xs">아직 받은 피드백이 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border bg-white p-4 shadow-sm h-full overflow-y-auto">
            <h3 className="mb-3 font-semibold text-slate-800 text-sm">선생님 피드백</h3>
            <div className="space-y-3">
                {feedbacks.map((fb) => (
                    <div
                        key={fb.id}
                        className={`rounded-lg p-3 text-xs border ${!fb.is_read ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-100"}`}
                    >
                        <div className="flex justify-between mb-1">
                            <span className="font-medium text-slate-700">{typeLabel[fb.feedback_type] || fb.feedback_type}</span>
                            {!fb.is_read && (
                                <span className="text-blue-600 font-semibold">NEW</span>
                            )}
                        </div>
                        <p className="text-slate-600 line-clamp-2">{fb.message}</p>
                        <p className="text-slate-400 mt-1">
                            {new Date(fb.created_at).toLocaleDateString("ko-KR")}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
