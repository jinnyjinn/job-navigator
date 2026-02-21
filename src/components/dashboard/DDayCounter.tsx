"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { DDayEvent } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, CalendarClock } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { differenceInCalendarDays, parseISO } from "date-fns";

export function DDayCounter() {
    const [events, setEvents] = useState<DDayEvent[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState("");
    const [date, setDate] = useState("");

    const supabase = createClient();

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from("dday_events")
            .select("*")
            .eq("user_id", user.id)
            .order("event_date", { ascending: true });

        if (error) {
            console.error("Failed to fetch D-Days:", error);
        } else {
            setEvents(data || []);
        }
    };

    const handleAddEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from("dday_events").insert({
            user_id: user.id,
            title,
            event_date: date,
        });

        if (error) {
            toast.error("일정을 추가하지 못했습니다.");
        } else {
            toast.success("일정이 추가되었습니다!");
            setTitle("");
            setDate("");
            setOpen(false);
            fetchEvents();
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("정말 삭제하시겠습니까?")) return;

        const { error } = await supabase.from("dday_events").delete().eq("id", id);
        if (error) {
            toast.error("삭제 실패");
        } else {
            toast.success("일정이 삭제되었습니다.");
            setEvents(events.filter(e => e.id !== id));
        }
    };

    const calculateDDay = (targetDate: string) => {
        const diff = differenceInCalendarDays(parseISO(targetDate), new Date());
        if (diff === 0) return "D-Day";
        return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
    };

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-purple-600" />
                    나의 일정
                </CardTitle>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-purple-600">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>새 일정 추가</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddEvent} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">일정 이름</Label>
                                <Input
                                    id="title"
                                    placeholder="예: 자격증 시험, 중간고사"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="date">날짜</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={loading}>
                                    {loading ? "추가 중..." : "추가하기"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {events.length === 0 ? (
                        <div className="text-center py-4 text-xs text-muted-foreground">
                            등록된 일정이 없습니다.<br />+ 버튼을 눌러 추가해보세요!
                        </div>
                    ) : (
                        events.map((event) => {
                            const dDay = calculateDDay(event.event_date);
                            const isImminent = dDay.startsWith("D-") && parseInt(dDay.split("-")[1]) <= 7;

                            return (
                                <div key={event.id} className="group flex items-center justify-between rounded-lg border p-3 transition-all hover:bg-slate-50">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-bold ${isImminent ? "text-red-500" : "text-purple-600"}`}>
                                                {dDay}
                                            </span>
                                            <span className="font-medium text-sm">{event.title}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            {event.event_date}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity"
                                        onClick={() => handleDelete(event.id)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            );
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
