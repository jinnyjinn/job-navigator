"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { DailyQuest, QuestCategory } from "@/types/database";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Clock, Flame, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

export function QuestList() {
    const [quests, setQuests] = useState<DailyQuest[]>([]);
    const [loading, setLoading] = useState(true);
    const [newQuest, setNewQuest] = useState("");
    const [category, setCategory] = useState<QuestCategory>("study");
    const [xpAwarded, setXpAwarded] = useState<number | null>(null);

    const supabase = createClient();
    const today = format(new Date(), "yyyy-MM-dd");

    useEffect(() => {
        fetchQuests();
    }, []);

    const fetchQuests = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from("daily_quests")
            .select("*")
            .eq("user_id", user.id)
            .eq("quest_date", today)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Error fetching quests:", error);
        } else {
            setQuests(data || []);
        }
        setLoading(false);
    };

    const handleAddQuest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (quests.length >= 5) {
            toast.error("하루 최대 5개까지만 등록할 수 있습니다.");
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from("daily_quests")
            .insert({
                user_id: user.id,
                content: newQuest,
                category,
                quest_date: today,
                xp_earned: 0 // XP given on completion
            })
            .select()
            .single();

        if (error) {
            toast.error("퀘스트 추가 실패");
        } else {
            setQuests([...quests, data]);
            setNewQuest("");
            toast.success("새로운 퀘스트가 등록되었습니다!");
        }
    };

    const handleToggle = async (id: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        const xpChange = newStatus ? 50 : 0; // 50 XP per quest

        const { error } = await supabase
            .from("daily_quests")
            .update({
                is_completed: newStatus,
                xp_earned: xpChange
            })
            .eq("id", id);

        if (error) {
            toast.error("상태 업데이트 실패");
            return;
        }

        setQuests(quests.map(q =>
            q.id === id ? { ...q, is_completed: newStatus, xp_earned: xpChange } : q
        ));

        if (newStatus) {
            toast.success("퀘스트 완료! +50 XP");
            triggerConfetti();
        }
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from("daily_quests").delete().eq("id", id);
        if (error) {
            toast.error("삭제 실패");
        } else {
            setQuests(quests.filter(q => q.id !== id));
            toast.success("퀘스트가 삭제되었습니다.");
        }
    };

    const triggerConfetti = () => {
        // Placeholder for confetti animation
        // Could use canvas-confetti library if user wants
        console.log("Confetti!");
    };

    const getCategoryColor = (cat: string) => {
        switch (cat) {
            case 'study': return 'bg-blue-100 text-blue-800';
            case 'cert': return 'bg-purple-100 text-purple-800';
            case 'project': return 'bg-green-100 text-green-800';
            case 'self': return 'bg-orange-100 text-orange-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    const getCategoryLabel = (cat: string) => {
        switch (cat) {
            case 'study': return '학업';
            case 'cert': return '자격증';
            case 'project': return '프로젝트';
            case 'self': return '자기계발';
            default: return '기타';
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    오늘의 퀘스트 ({quests.filter(q => q.is_completed).length}/{quests.length})
                </CardTitle>
                <div className="flex items-center gap-1 text-sm font-medium text-orange-500 bg-orange-50 px-2 py-1 rounded-full">
                    <Flame className="h-4 w-4 fill-orange-500" />
                    <span>Streak 🔥</span>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* List */}
                    <div className="space-y-2">
                        {quests.length === 0 && (
                            <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                                등록된 퀘스트가 없습니다.<br />
                                오늘의 목표를 세워보세요!
                            </div>
                        )}
                        {quests.map((quest) => (
                            <div
                                key={quest.id}
                                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${quest.is_completed ? "bg-green-50 border-green-200" : "bg-white hover:border-blue-300"
                                    }`}
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    <Checkbox
                                        checked={quest.is_completed}
                                        onCheckedChange={() => handleToggle(quest.id, quest.is_completed)}
                                        className="h-5 w-5"
                                    />
                                    <div className="space-y-1">
                                        <div className={`font-medium ${quest.is_completed ? "line-through text-slate-500" : ""}`}>
                                            {quest.content}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className={`px-2 py-0.5 rounded-full ${getCategoryColor(quest.category)}`}>
                                                {getCategoryLabel(quest.category)}
                                            </span>
                                            {quest.xp_earned > 0 && (
                                                <span className="text-orange-600 font-bold">+{quest.xp_earned} XP</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(quest.id)}
                                    className="text-slate-400 hover:text-red-500"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    {/* Add Form */}
                    <form onSubmit={handleAddQuest} className="flex gap-2 mt-4 pt-4 border-t">
                        <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                            <SelectTrigger className="w-[100px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="study">학업</SelectItem>
                                <SelectItem value="cert">자격증</SelectItem>
                                <SelectItem value="project">프로젝트</SelectItem>
                                <SelectItem value="self">자기계발</SelectItem>
                                <SelectItem value="etc">기타</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input
                            placeholder="새로운 퀘스트 입력..."
                            value={newQuest}
                            onChange={(e) => setNewQuest(e.target.value)}
                            className="flex-1"
                        />
                        <Button type="submit" size="icon" disabled={!newQuest.trim()}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </CardContent>
        </Card>
    );
}
