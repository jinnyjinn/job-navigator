"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Project, ProjectCategory } from "@/types/database";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EditProjectDialogProps {
    project: Project;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function EditProjectDialog({ project, open, onOpenChange, onSuccess }: EditProjectDialogProps) {
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState(project.title);
    const [category, setCategory] = useState<ProjectCategory>(project.category);
    const [summary, setSummary] = useState(project.summary || "");
    const [description, setDescription] = useState(project.description || "");
    const [tags, setTags] = useState((project.tech_tags || []).join(", "));
    const [githubUrl, setGithubUrl] = useState(project.github_url || "");
    const [deployUrl, setDeployUrl] = useState(project.deploy_url || "");
    const [startDate, setStartDate] = useState(project.start_date || "");
    const [endDate, setEndDate] = useState(project.end_date || "");
    const [learnings, setLearnings] = useState(project.learnings || "");
    const [achievements, setAchievements] = useState(project.achievements || "");

    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error("프로젝트명을 입력해주세요.");
            return;
        }
        setLoading(true);

        const techTags = tags.split(",").map((t) => t.trim()).filter(Boolean);

        const { error } = await supabase
            .from("projects")
            .update({
                title: title.trim(),
                category,
                summary: summary.trim() || null,
                description: description.trim() || null,
                tech_tags: techTags,
                github_url: githubUrl.trim() || null,
                deploy_url: deployUrl.trim() || null,
                start_date: startDate || null,
                end_date: endDate || null,
                learnings: learnings.trim() || null,
                achievements: achievements.trim() || null,
            })
            .eq("id", project.id);

        if (error) {
            toast.error("수정 실패: " + error.message);
        } else {
            toast.success("프로젝트가 수정되었습니다!");
            onSuccess();
            onOpenChange(false);
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>프로젝트 수정</DialogTitle>
                    <DialogDescription>
                        프로젝트 정보를 수정합니다.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>카테고리</Label>
                            <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="class">수업 활동</SelectItem>
                                    <SelectItem value="project">개인 프로젝트</SelectItem>
                                    <SelectItem value="contest">대회/공모전</SelectItem>
                                    <SelectItem value="intern">현장 실습</SelectItem>
                                    <SelectItem value="cert">자격증</SelectItem>
                                    <SelectItem value="volunteer">봉사활동</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>시작 날짜</Label>
                            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>종료 날짜 (선택)</Label>
                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <Label>프로젝트명 *</Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="예: 나만의 포트폴리오 웹사이트 만들기"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>한 줄 소개</Label>
                        <Input
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            placeholder="프로젝트의 핵심 목표나 성과를 간단히 적어주세요."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>상세 설명</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="프로젝트에 대한 자세한 내용을 작성하세요..."
                            className="min-h-[100px]"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>사용 기술 / 태그 (콤마로 구분)</Label>
                        <Input
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="React, Supabase, TailwindCSS..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>GitHub URL</Label>
                            <Input
                                value={githubUrl}
                                onChange={(e) => setGithubUrl(e.target.value)}
                                placeholder="https://github.com/..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>배포 URL</Label>
                            <Input
                                value={deployUrl}
                                onChange={(e) => setDeployUrl(e.target.value)}
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>배운 점</Label>
                        <Textarea
                            value={learnings}
                            onChange={(e) => setLearnings(e.target.value)}
                            placeholder="이 프로젝트를 통해 배운 점을 적어보세요..."
                            className="min-h-[80px]"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>성과 및 결과</Label>
                        <Textarea
                            value={achievements}
                            onChange={(e) => setAchievements(e.target.value)}
                            placeholder="달성한 성과나 결과를 적어보세요..."
                            className="min-h-[80px]"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            취소
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            저장하기
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
