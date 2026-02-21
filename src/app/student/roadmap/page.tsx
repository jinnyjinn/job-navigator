"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { RoadmapItem } from "@/types/database";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Flag, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoadmapTimeline } from "@/components/roadmap/RoadmapTimeline";
import { AddMilestoneDialog } from "@/components/roadmap/AddMilestoneDialog";

export default function RoadmapPage() {
    const [loading, setLoading] = useState(true);
    const [roadmaps, setRoadmaps] = useState<RoadmapItem[]>([]);
    const [activeTab, setActiveTab] = useState("1"); // Default to Grade 1
    const [openAdd, setOpenAdd] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        fetchRoadmaps();
    }, []);

    const fetchRoadmaps = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from("roadmaps")
            .select("*")
            .eq("user_id", user.id)
            .order("sort_order", { ascending: true })
            .order("target_date", { ascending: true });

        if (!error) {
            setRoadmaps(data as RoadmapItem[] || []);
        }
        setLoading(false);
    };

    const getRoadmapsByGrade = (grade: number) => {
        return roadmaps.filter(r => r.grade === grade);
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="container max-w-5xl py-8 space-y-8">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">커리어 로드맵</h1>
                    <p className="text-muted-foreground">
                        3년간의 성장 계획을 세우고 차근차근 달성해보세요.
                    </p>
                </div>
                <Button onClick={() => setOpenAdd(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    마일스톤 추가
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                    <TabsTrigger value="1">1학년</TabsTrigger>
                    <TabsTrigger value="2">2학년</TabsTrigger>
                    <TabsTrigger value="3">3학년</TabsTrigger>
                </TabsList>

                {[1, 2, 3].map((grade) => (
                    <TabsContent key={grade} value={grade.toString()} className="space-y-4">
                        <div className="rounded-xl border bg-white p-6 md:p-8 min-h-[500px]">
                            <div className="mb-6 flex items-center gap-2">
                                <Flag className="h-5 w-5 text-purple-600" />
                                <h2 className="text-xl font-semibold">{grade}학년 목표</h2>
                            </div>

                            <RoadmapTimeline
                                items={getRoadmapsByGrade(grade)}
                                onUpdate={fetchRoadmaps}
                            />

                            {getRoadmapsByGrade(grade).length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                    <MapPin className="h-12 w-12 text-slate-200 mb-4" />
                                    <p>아직 등록된 마일스톤이 없습니다.</p>
                                    <Button variant="link" onClick={() => setOpenAdd(true)}>
                                        첫 번째 목표를 세워보세요!
                                    </Button>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                ))}
            </Tabs>

            <AddMilestoneDialog
                open={openAdd}
                onOpenChange={setOpenAdd}
                defaultGrade={parseInt(activeTab)}
                onSuccess={fetchRoadmaps}
            />
        </div>
    );
}
