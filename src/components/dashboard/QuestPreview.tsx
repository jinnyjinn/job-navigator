"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollText, ChevronRight, CheckCircle2, Circle, Loader2 } from "lucide-react";
import Link from "next/link";

interface Quest {
    id: string;
    content: string;
    xp_earned: number;
    is_completed: boolean;
    category: string;
}

export function QuestPreview() {
    const [quests, setQuests] = useState<Quest[]>([]);
    const [loading, setLoading] = useState(true);

    const supabase = createClient();

    useEffect(() => {
        async function fetchTodayQuests() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            const today = new Date().toISOString().split("T")[0];

            const { data } = await supabase
                .from("daily_quests")
                .select("id, content, xp_earned, is_completed, category")
                .eq("user_id", user.id)
                .eq("quest_date", today)
                .order("created_at", { ascending: true })
                .limit(4);

            setQuests(data || []);
            setLoading(false);
        }

        fetchTodayQuests();
    }, []);

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <ScrollText className="h-4 w-4 text-orange-500" />
                    오늘의 퀘스트
                </CardTitle>
                <Link href="/student/quest">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </Link>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : quests.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                        오늘 등록된 퀘스트가 없습니다.
                        <br />
                        <Link href="/student/quest" className="text-orange-500 hover:underline mt-1 inline-block">
                            퀘스트 추가하기 →
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {quests.map((quest) => (
                            <div key={quest.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    {quest.is_completed ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                    ) : (
                                        <Circle className="h-5 w-5 text-slate-300 shrink-0" />
                                    )}
                                    <div className="space-y-0.5 min-w-0">
                                        <span className={`text-sm font-medium block truncate ${quest.is_completed ? "text-slate-400 line-through" : ""}`}>
                                            {quest.content}
                                        </span>
                                        <div className="text-[10px] text-orange-600 font-bold">
                                            +{quest.xp_earned} XP
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
