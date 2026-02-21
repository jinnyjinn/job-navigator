"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { subDays, format, isSameDay, eachDayOfInterval, startOfWeek, endOfWeek } from "date-fns";
import { ko } from "date-fns/locale";

interface ActivityHeatmapProps {
    activityLogs: { date: string; count: number }[];
}

export function ActivityHeatmap({ activityLogs }: ActivityHeatmapProps) {
    const today = new Date();
    const startDate = subDays(today, 84); // 12 weeks approx

    const days = eachDayOfInterval({
        start: startDate,
        end: today,
    });

    const getActivityLevel = (count: number) => {
        if (count === 0) return 0;
        if (count < 3) return 1;
        if (count < 6) return 2;
        if (count < 10) return 3;
        return 4;
    };

    const getLevelColor = (level: number) => {
        switch (level) {
            case 0: return "bg-slate-100";
            case 1: return "bg-green-200";
            case 2: return "bg-green-400";
            case 3: return "bg-green-600";
            case 4: return "bg-green-800";
            default: return "bg-slate-100";
        }
    };

    return (
        <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">최근 활동</h4>
            <div className="flex flex-wrap gap-1">
                <TooltipProvider>
                    {days.map((day) => {
                        const logEntry = activityLogs.find(log => isSameDay(new Date(log.date), day));
                        const count = logEntry?.count ?? 0;
                        const level = getActivityLevel(count);

                        return (
                            <Tooltip key={day.toISOString()}>
                                <TooltipTrigger asChild>
                                    <div
                                        className={cn(
                                            "h-3 w-3 rounded-[2px] transition-colors hover:ring-2 hover:ring-slate-400 hover:ring-offset-1",
                                            getLevelColor(level)
                                        )}
                                    />
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    <p className="text-xs">
                                        {format(day, "M월 d일 (EEE)", { locale: ko })}: {count}건의 활동
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </TooltipProvider>
            </div>
            <div className="flex justify-end items-center gap-2 text-[10px] text-muted-foreground mt-2">
                <span>Less</span>
                <div className="flex gap-1">
                    <div className="h-2 w-2 rounded-[1px] bg-slate-100" />
                    <div className="h-2 w-2 rounded-[1px] bg-green-200" />
                    <div className="h-2 w-2 rounded-[1px] bg-green-400" />
                    <div className="h-2 w-2 rounded-[1px] bg-green-600" />
                    <div className="h-2 w-2 rounded-[1px] bg-green-800" />
                </div>
                <span>More</span>
            </div>
        </div>
    );
}
