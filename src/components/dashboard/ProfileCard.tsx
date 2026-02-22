"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Loader2, GraduationCap, Building2, BookOpen, Briefcase, Users, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { JoinClassDialog } from "./JoinClassDialog";
import { useRouter } from "next/navigation";

interface ProfileCardProps {
    profile: any;
}

export function ProfileCard({ profile }: ProfileCardProps) {
    const [classroom, setClassroom] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [openJoin, setOpenJoin] = useState(false);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        async function fetchClassroom() {
            if (!profile?.id) return;

            // Fetch classroom membership
            const { data: memberData } = await supabase
                .from("classroom_members")
                .select("classroom_id")
                .eq("student_id", profile.id)
                .single();

            if (memberData) {
                const { data: classData } = await supabase
                    .from("classrooms")
                    .select("*")
                    .eq("id", memberData.classroom_id)
                    .single();

                if (classData) {
                    setClassroom(classData);
                }
            }
            setLoading(false);
        }

        fetchClassroom();
    }, [profile, supabase]);

    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            window.location.href = "/auth";
        } catch (error) {
            console.error("Logout error:", error);
            window.location.href = "/auth"; // 에러가 나도 일단 이동 시도
        }
    };

    if (!profile) {
        return <ProfileCardSkeleton />;
    }

    return (
        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
            <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 text-white/70 hover:bg-white/10 hover:text-white"
                onClick={handleLogout}
            >
                <LogOut className="mr-2 h-4 w-4" />
                로그아웃
            </Button>
            <CardContent className="p-6">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/20 text-4xl font-bold ring-4 ring-white/10 backdrop-blur-sm">
                            {profile.name?.[0] || <GraduationCap className="h-10 w-10 opacity-50" />}
                        </div>
                        <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                            Lv.{profile.level || 1} Explorer
                        </Badge>
                    </div>

                    {/* Info Section */}
                    <div className="flex-1 space-y-4 text-center md:text-left">
                        <div>
                            <h2 className="text-2xl font-bold">{profile.name}</h2>
                            <p className="text-blue-100">{profile.bio || "오늘도 꿈을 향해 나아갑니다!"}</p>
                        </div>

                        <div className="grid grid-cols-1 gap-2 text-sm text-blue-50 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="flex items-center justify-center gap-2 rounded-lg bg-white/10 p-2 md:justify-start">
                                <Building2 className="h-4 w-4" />
                                <span>{profile.school_name || "학교 미입력"}</span>
                            </div>
                            <div className="flex items-center justify-center gap-2 rounded-lg bg-white/10 p-2 md:justify-start">
                                <BookOpen className="h-4 w-4" />
                                <span>{profile.major || "학과 미입력"}</span>
                            </div>
                            <div className="flex items-center justify-center gap-2 rounded-lg bg-white/10 p-2 md:justify-start">
                                <Briefcase className="h-4 w-4" />
                                <span>{profile.desired_job || "희망직무 미입력"}</span>
                            </div>
                            <div className="flex items-center justify-center gap-2 rounded-lg bg-white/10 p-2 md:justify-start">
                                <Users className="h-4 w-4" />
                                {loading ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : classroom ? (
                                    <span>{classroom.grade}학년 {classroom.class_number}반</span>
                                ) : (
                                    <span className="opacity-60">
                                        학급 없음
                                        <Button
                                            variant="link"
                                            className="h-auto p-0 ml-2 text-white/80 hover:text-white"
                                            onClick={() => setOpenJoin(true)}
                                        >
                                            참여하기
                                        </Button>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>

            <JoinClassDialog
                open={openJoin}
                onOpenChange={setOpenJoin}
                onSuccess={() => {
                    // Refetch profile or classroom (simple way: page reload or callback)
                    window.location.reload();
                }}
            />
        </Card>
    );
}

function ProfileCardSkeleton() {
    return (
        <Card className="border-none bg-slate-100">
            <CardContent className="p-6">
                <div className="flex flex-col gap-6 md:flex-row">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div className="space-y-4 flex-1">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-full max-w-md" />
                        <div className="grid grid-cols-2 gap-4">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
