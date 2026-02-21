"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { ProjectCategory } from "@/types/database";
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

interface AddProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function AddProjectDialog({ open, onOpenChange, onSuccess }: AddProjectDialogProps) {
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState<ProjectCategory>("project");
    const [summary, setSummary] = useState("");
    const [tags, setTags] = useState("");
    const [githubUrl, setGithubUrl] = useState("");
    const [startDate, setStartDate] = useState("");

    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const techTags = tags.split(",").map(t => t.trim()).filter(Boolean);

        const { error } = await supabase.from("projects").insert({
            user_id: user.id,
            title,
            category,
            summary,
            tech_tags: techTags,
            github_url: githubUrl || null,
            start_date: startDate || null,
        });

        if (error) {
            toast.error("프로젝트 추가 실패", { description: error.message });
        } else {
            toast.success("프로젝트가 추가되었습니다!");
            onSuccess();
            onOpenChange(false);
            // Reset
            setTitle("");
            setSummary("");
            setTags("");
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>새 프로젝트 추가</DialogTitle>
                    <DialogDescription>
                        포트폴리오에 추가할 활동이나 프로젝트를 입력하세요.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
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
                            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>프로젝트명</Label>
                        <Input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="예: 나만의 포트폴리오 웹사이트 만들기"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>한 줄 소개</Label>
                        <Input
                            value={summary}
                            onChange={e => setSummary(e.target.value)}
                            placeholder="프로젝트의 핵심 목표나 성과를 간단히 적어주세요."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>사용 기술 / 태그 (콤마로 구분)</Label>
                        <Input
                            value={tags}
                            onChange={e => setTags(e.target.value)}
                            placeholder="React, Supabase, TailwindCSS..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>GitHub URL (선택)</Label>
                        <Input
                            value={githubUrl}
                            onChange={e => setGithubUrl(e.target.value)}
                            placeholder="https://github.com/..."
                        />
                    </div>

                    <DialogFooter>
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
