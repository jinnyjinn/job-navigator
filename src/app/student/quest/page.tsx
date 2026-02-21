"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { QuestList } from "@/components/quest/QuestList";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Loader2 } from "lucide-react";
import { ko } from "date-fns/locale";

export default function QuestPage() {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [activityLogs, setActivityLogs] = useState<{ date: string; count: number }[]>([]);
    const [monthStats, setMonthStats] = useState({ completed: 0, xp: 0 });
    const [loading, setLoading] = useState(true);

    const supabase = createClient();

    useEffect(() => {
        async function loadQuestData() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
                .toISOString()
                .split("T")[0];

            const [logsResult, monthResult] = await Promise.all([
                supabase
                    .from("activity_logs")
                    .select("created_at")
                    .eq("user_id", user.id)
                    .gte("created_at", ninetyDaysAgo.toISOString()),
                supabase
                    .from("daily_quests")
                    .select("is_completed, xp_earned")
                    .eq("user_id", user.id)
                    .gte("quest_date", monthStart),
            ]);

            if (logsResult.data) {
                const dateMap: Record<string, number> = {};
                logsResult.data.forEach((log) => {
                    const d = new Date(log.created_at).toISOString().split("T")[0];
                    dateMap[d] = (dateMap[d] || 0) + 1;
                });
                setActivityLogs(
                    Object.entries(dateMap).map(([d, count]) => ({ date: d, count }))
                );
            }

            if (monthResult.data) {
                const completed = monthResult.data.filter((q) => q.is_completed).length;
                const xp = monthResult.data.reduce((sum, q) => sum + (q.xp_earned || 0), 0);
                setMonthStats({ completed, xp });
            }

            setLoading(false);
        }

        loadQuestData();
    }, []);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="container max-w-5xl py-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">데일리 퀘스트</h1>
                <p className="text-muted-foreground">
                    매일매일 작은 성취가 모여 큰 꿈을 이룹니다.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-12">
                {/* Left Column: Quest List */}
                <div className="md:col-span-7 lg:col-span-8 space-y-6">
                    <QuestList />

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">퀘스트 수행 기록 (잔디 심기)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ActivityHeatmap activityLogs={activityLogs} />
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Calendar & Stats */}
                <div className="md:col-span-5 lg:col-span-4 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">캘린더</CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-center">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                locale={ko}
                                className="rounded-md border"
                            />
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-emerald-200">
                        <CardHeader>
                            <CardTitle className="text-emerald-800">이번 달 통계</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <div className="text-2xl font-bold text-emerald-700">{monthStats.completed}</div>
                                    <div className="text-xs text-emerald-600">완료한 퀘스트</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-emerald-700">{monthStats.xp}</div>
                                    <div className="text-xs text-emerald-600">획득 XP</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
