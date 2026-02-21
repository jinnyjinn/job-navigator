"use client";

import { RoadmapItem } from "@/types/database";
import { Badge } from "@/components/ui/badge";
// Removed unused react-vertical-timeline-component imports
// Using custom Tailwind implementation instead
import { Star, Code, Briefcase, Award, CheckCircle2, Circle, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

interface RoadmapTimelineProps {
    items: RoadmapItem[];
    onUpdate: () => void;
}

export function RoadmapTimeline({ items, onUpdate }: RoadmapTimelineProps) {
    const supabase = createClient();

    const handleStatusChange = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'done' ? 'prep' : 'done'; // Toggle for simplicity or cycle through
        // Better UX: Dropdown or cycling Prep -> Ing -> Done
        // Let's implement Cycle: Prep -> Ing -> Done -> Prep
        let nextStatus = 'prep';
        if (currentStatus === 'prep') nextStatus = 'ing';
        else if (currentStatus === 'ing') nextStatus = 'done';

        const { error } = await supabase
            .from('roadmaps')
            .update({ status: nextStatus })
            .eq('id', id);

        if (error) {
            toast.error("상태 업데이트 실패");
        } else {
            toast.success("상태가 변경되었습니다.");
            onUpdate();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("삭제하시겠습니까?")) return;
        const { error } = await supabase.from('roadmaps').delete().eq('id', id);
        if (!error) {
            toast.success("삭제되었습니다.");
            onUpdate();
        }
    };

    const getIcon = (title: string) => {
        if (title.includes("자격증")) return <Award />;
        if (title.includes("프로젝트")) return <Code />;
        if (title.includes("취업") || title.includes("실습")) return <Briefcase />;
        return <Star />;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'done': return '#22c55e'; // green-500
            case 'ing': return '#3b82f6'; // blue-500
            default: return '#94a3b8'; // slate-400
        }
    };

    return (
        <div className="py-4">
            {/* 
                Note: react-vertical-timeline-component might have hydration issues in Next.js 13+ 
                if not strictly client-side. We are in "use client", so it should be okay, 
                but sometimes needs dynamic import or custom CSS timeline if it fails.
                For now, let's try a custom Tailwind Timeline simple version to be safe and cleaner 
                (and avoid extra heavy deps if package isn't installed).
                Wait, I don't think I installed `react-vertical-timeline-component`.
                Package.json didn't show it.
                I should build a custom CSS timeline.
            */}
            <div className="relative border-l-2 border-slate-200 ml-4 md:ml-6 space-y-10 pb-10">
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;
                    const statusColor = item.status === 'done' ? "bg-green-500" : item.status === 'ing' ? "bg-blue-500" : "bg-slate-300";

                    return (
                        <div key={item.id} className="relative pl-8 md:pl-10">
                            {/* Dot on line */}
                            <div
                                className={`absolute -left-[9px] top-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white ring-4 ring-slate-50 ${statusColor} text-white cursor-pointer hover:scale-110 transition-transform`}
                                onClick={() => handleStatusChange(item.id, item.status)}
                                title="상태 변경 (클릭)"
                            >
                                {item.status === 'done' && <CheckCircle2 className="h-3 w-3" />}
                                {item.status === 'ing' && <Clock className="h-3 w-3" />}
                                {item.status === 'prep' && <Circle className="h-3 w-3" />}
                            </div>

                            {/* Card content */}
                            <div className="flex flex-col gap-2 rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-slate-900">{item.title}</h3>
                                            <Badge variant={item.status === 'done' ? "default" : "secondary"} className={item.status === 'done' ? "bg-green-500 hover:bg-green-600" : ""}>
                                                {item.status === 'done' ? '완료됨' : item.status === 'ing' ? '진행 중' : '준비'}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {item.target_date ? format(parseISO(item.target_date), "yyyy년 M월 d일 목표", { locale: ko }) : "날짜 미정"}
                                        </p>
                                    </div>
                                    <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-500">
                                        &times;
                                    </button>
                                </div>
                                {item.description && (
                                    <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-3 rounded-md">
                                        {item.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
