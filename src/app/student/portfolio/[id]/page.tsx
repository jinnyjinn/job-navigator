"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Project } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft, Github, Globe, Calendar, Tag, Pencil, Trash2,
    Loader2, BookOpen, Trophy, ExternalLink
} from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import { EditProjectDialog } from "@/components/portfolio/EditProjectDialog";

const CATEGORY_LABELS: Record<string, string> = {
    class: "수업",
    project: "프로젝트",
    contest: "대회",
    intern: "인턴/실습",
    cert: "자격증",
    volunteer: "봉사",
};

const CATEGORY_COLORS: Record<string, string> = {
    class: "bg-blue-50 text-blue-700 border-blue-200",
    project: "bg-purple-50 text-purple-700 border-purple-200",
    contest: "bg-orange-50 text-orange-700 border-orange-200",
    intern: "bg-green-50 text-green-700 border-green-200",
    cert: "bg-yellow-50 text-yellow-700 border-yellow-200",
    volunteer: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [isOwner, setIsOwner] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    const supabase = createClient();

    const loadProject = useCallback(async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from("projects")
            .select("*")
            .eq("id", projectId)
            .single();

        if (error || !data) {
            setLoading(false);
            return;
        }

        setProject(data as Project);
        setIsOwner(user?.id === data.user_id);
        setLoading(false);
    }, [projectId, supabase]);

    useEffect(() => {
        loadProject();
    }, [loadProject]);

    const handleDelete = async () => {
        if (!confirm("이 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
        setDeleting(true);

        const { error } = await supabase.from("projects").delete().eq("id", projectId);
        if (error) {
            toast.error("삭제 실패: " + error.message);
            setDeleting(false);
        } else {
            toast.success("프로젝트가 삭제되었습니다.");
            router.push("/student/portfolio");
        }
    };

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-slate-400 gap-4">
                <p className="text-lg font-medium">프로젝트를 찾을 수 없습니다.</p>
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> 돌아가기
                </Button>
            </div>
        );
    }

    return (
        <div className="container max-w-4xl py-8 space-y-8">
            {/* Header */}
            <div className="flex items-start gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="mt-1 shrink-0">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge
                            variant="outline"
                            className={CATEGORY_COLORS[project.category] || ""}
                        >
                            {CATEGORY_LABELS[project.category] || project.category}
                        </Badge>
                        {project.start_date && (
                            <span className="text-sm text-slate-500 flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {format(new Date(project.start_date), "yyyy.MM", { locale: ko })}
                                {project.end_date && ` ~ ${format(new Date(project.end_date), "yyyy.MM", { locale: ko })}`}
                            </span>
                        )}
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 break-words">{project.title}</h1>
                    {project.summary && (
                        <p className="mt-2 text-slate-600 text-lg leading-relaxed">{project.summary}</p>
                    )}
                </div>
                {isOwner && (
                    <div className="flex gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                            <Pencil className="mr-1.5 h-3.5 w-3.5" /> 수정
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:bg-red-50 hover:border-red-200"
                            onClick={handleDelete}
                            disabled={deleting}
                        >
                            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                    </div>
                )}
            </div>

            {/* Thumbnail */}
            {project.thumbnail_url && (
                <div className="relative w-full h-64 md:h-96 rounded-2xl overflow-hidden bg-slate-100 shadow-md">
                    <Image
                        src={project.thumbnail_url}
                        alt={project.title}
                        fill
                        className="object-cover"
                    />
                </div>
            )}

            {/* Links */}
            {(project.github_url || project.deploy_url) && (
                <div className="flex flex-wrap gap-3">
                    {project.github_url && (
                        <a
                            href={project.github_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"
                        >
                            <Github className="h-4 w-4" /> GitHub
                            <ExternalLink className="h-3 w-3 text-slate-400" />
                        </a>
                    )}
                    {project.deploy_url && (
                        <a
                            href={project.deploy_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-200 hover:bg-blue-50 text-sm font-medium text-blue-700 transition-colors"
                        >
                            <Globe className="h-4 w-4" /> 배포 링크
                            <ExternalLink className="h-3 w-3 text-blue-400" />
                        </a>
                    )}
                </div>
            )}

            {/* Tech Tags */}
            {project.tech_tags && project.tech_tags.length > 0 && (
                <div>
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Tag className="h-4 w-4" /> 기술 스택
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {project.tech_tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-sm px-3 py-1">
                                {tag}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            {/* Description */}
            {project.description && (
                <div>
                    <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-blue-500" /> 프로젝트 설명
                    </h2>
                    <div className="prose prose-slate max-w-none rounded-xl border bg-white p-6 shadow-sm">
                        <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">
                            {project.description}
                        </pre>
                    </div>
                </div>
            )}

            {/* Learnings + Achievements */}
            {(project.learnings || project.achievements) && (
                <div className="grid md:grid-cols-2 gap-6">
                    {project.learnings && (
                        <div className="rounded-xl border bg-blue-50/50 p-5">
                            <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-blue-500" /> 배운 점
                            </h2>
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {project.learnings}
                            </p>
                        </div>
                    )}
                    {project.achievements && (
                        <div className="rounded-xl border bg-yellow-50/50 p-5">
                            <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <Trophy className="h-4 w-4 text-yellow-500" /> 성과 및 결과
                            </h2>
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {project.achievements}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Image Gallery */}
            {project.image_urls && project.image_urls.length > 0 && (
                <div>
                    <h2 className="text-lg font-bold text-slate-800 mb-3">이미지 갤러리</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {project.image_urls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                                <div className="relative h-40 rounded-xl overflow-hidden bg-slate-100 hover:opacity-90 transition-opacity">
                                    <Image src={url} alt={`이미지 ${i + 1}`} fill className="object-cover" />
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Edit Dialog */}
            {editOpen && project && (
                <EditProjectDialog
                    project={project}
                    open={editOpen}
                    onOpenChange={setEditOpen}
                    onSuccess={() => {
                        setEditOpen(false);
                        loadProject();
                    }}
                />
            )}
        </div>
    );
}
