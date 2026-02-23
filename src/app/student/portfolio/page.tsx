"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Project } from "@/types/database";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { AddProjectDialog } from "@/components/portfolio/AddProjectDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FolderOpen } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function PortfolioPage() {
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [openAdd, setOpenAdd] = useState(false);

    const supabase = createClient();

    const fetchProjects = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from("projects")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (!error) {
            setProjects(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredProjects = filter === "all"
        ? projects
        : projects.filter(p => p.category === filter);

    return (
        <div className="container max-w-6xl py-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">포트폴리오 & 아카이브</h1>
                    <p className="text-muted-foreground">
                        나의 학습 결과물과 프로젝트를 한눈에 모아보세요.
                    </p>
                </div>
                <Button onClick={() => setOpenAdd(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    프로젝트 추가
                </Button>
            </div>

            <div className="flex flex-col gap-6">
                <Tabs defaultValue="all" value={filter} onValueChange={setFilter} className="w-full">
                    <TabsList className="flex flex-wrap h-auto p-1 bg-slate-100/50 justify-start">
                        <TabsTrigger value="all">전체</TabsTrigger>
                        <TabsTrigger value="project">프로젝트</TabsTrigger>
                        <TabsTrigger value="class">수업</TabsTrigger>
                        <TabsTrigger value="contest">대회</TabsTrigger>
                        <TabsTrigger value="cert">자격증</TabsTrigger>
                        <TabsTrigger value="intern">실습</TabsTrigger>
                        <TabsTrigger value="volunteer">봉사</TabsTrigger>
                    </TabsList>
                </Tabs>

                {loading ? (
                    <div className="flex h-60 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : filteredProjects.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProjects.map((project) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                onClick={() => router.push(`/student/portfolio/${project.id}`)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-slate-50/50">
                        <FolderOpen className="h-12 w-12 text-slate-300 mb-4" />
                        <p className="text-lg font-medium">등록된 프로젝트가 없습니다.</p>
                        <p className="text-sm">첫 번째 프로젝트를 추가하고 포트폴리오를 채워보세요!</p>
                    </div>
                )}
            </div>

            <AddProjectDialog
                open={openAdd}
                onOpenChange={setOpenAdd}
                onSuccess={fetchProjects}
            />
        </div>
    );
}
