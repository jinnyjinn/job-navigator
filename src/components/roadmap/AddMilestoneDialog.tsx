"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
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

interface AddMilestoneDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultGrade: number;
    onSuccess: () => void;
}

const TEMPLATES = [
    { label: "자격증 취득", value: "자격증" },
    { label: "동아리 프로젝트", value: "프로젝트" },
    { label: "현장 실습", value: "실습" },
    { label: "포트폴리오 완성", value: "포트폴리오" },
    { label: "입사 지원", value: "취업" },
    { label: "직접 입력", value: "custom" },
];

export function AddMilestoneDialog({ open, onOpenChange, defaultGrade, onSuccess }: AddMilestoneDialogProps) {
    const [loading, setLoading] = useState(false);
    const [grade, setGrade] = useState(defaultGrade.toString());
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [targetDate, setTargetDate] = useState("");
    const [template, setTemplate] = useState("custom");

    const supabase = createClient();

    // State sync when prop changes (during render is preferred for synchronous updates)
    const [prevOpen, setPrevOpen] = useState(open);
    if (open !== prevOpen) {
        setPrevOpen(open);
        if (open) {
            setGrade(defaultGrade.toString());
        }
    }

    const handleTemplateChange = (val: string) => {
        setTemplate(val);
        if (val !== "custom") {
            setTitle(val); // Pre-fill title
        } else {
            setTitle("");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from("roadmaps").insert({
            user_id: user.id,
            grade: parseInt(grade),
            title,
            description,
            target_date: targetDate || null,
            status: 'prep',
        });

        if (error) {
            toast.error("저장 실패", { description: error.message });
        } else {
            toast.success("마일스톤이 추가되었습니다!");
            onSuccess();
            onOpenChange(false);
            // Reset form
            setTitle("");
            setDescription("");
            setTargetDate("");
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>새 마일스톤 추가</DialogTitle>
                    <DialogDescription>
                        이루고 싶은 목표를 등록하세요.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>학년</Label>
                            <Select value={grade} onValueChange={setGrade}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1학년</SelectItem>
                                    <SelectItem value="2">2학년</SelectItem>
                                    <SelectItem value="3">3학년</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>템플릿</Label>
                            <Select value={template} onValueChange={handleTemplateChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="선택하세요" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TEMPLATES.map(t => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">목표명</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="예: 정보처리기능사 취득"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="date">목표 날짜 (선택)</Label>
                        <Input
                            id="date"
                            type="date"
                            value={targetDate}
                            onChange={(e) => setTargetDate(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="desc">설명 / 메모</Label>
                        <Textarea
                            id="desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="구체적인 계획이나 필요한 준비물을 적어보세요."
                            className="resize-none"
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            추가하기
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
