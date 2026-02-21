"use client";

import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star } from "lucide-react";
import { calculateLevel, calculateNextLevelXP, getLevelTitle } from "@/utils/gamification";

interface XPProgressProps {
    totalXP: number;
    streak?: number;
}

export function XPProgress({ totalXP, streak = 0 }: XPProgressProps) {
    const level = calculateLevel(totalXP);
    const nextLevelXP = calculateNextLevelXP(level);
    const prevLevelXP = (level - 1) * 1000;
    const currentLevelXP = totalXP - prevLevelXP;
    const levelRange = nextLevelXP - prevLevelXP;
    const progress = Math.min(100, Math.max(0, (currentLevelXP / levelRange) * 100));
    const title = getLevelTitle(level);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 ring-4 ring-yellow-50">
                            <Trophy className="h-6 w-6 text-yellow-600" />
                        </div>
                        <Badge className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-blue-600 p-0 text-xs text-white">
                            {level}
                        </Badge>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900">{title}</h3>
                        <p className="text-xs text-muted-foreground">Level {level} Explorer</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="flex items-center justify-end gap-1 text-sm font-medium text-slate-700">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{totalXP.toLocaleString()} XP</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        다음 레벨까지 {Math.max(0, nextLevelXP - totalXP).toLocaleString()} XP
                    </p>
                </div>
            </div>

            <div className="space-y-1">
                <Progress value={progress} className="h-3" />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Lv.{level}</span>
                    <span>{Math.floor(progress)}%</span>
                    <span>Lv.{level + 1}</span>
                </div>
            </div>

            {streak > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700">
                    <span className="text-lg">🔥</span>
                    <span className="font-medium">{streak}일 연속 학습 중!</span>
                </div>
            )}
        </div>
    );
}
