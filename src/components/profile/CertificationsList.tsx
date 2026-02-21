"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Award } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface Certification {
    id: string;
    cert_name: string;
    issuer: string;
    grade_or_score: string;
    acquired_date: string;
    is_acquired: boolean;
    exam_date: string;
}

export function CertificationsList({ userId }: { userId: string }) {
    const supabase = createClient();
    const [certs, setCerts] = useState<Certification[]>([]);
    const [loading, setLoading] = useState(true);
    const [openOutput, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [certName, setCertName] = useState("");
    const [issuer, setIssuer] = useState("");
    const [score, setScore] = useState("");
    const [date, setDate] = useState("");
    const [acquired, setAcquired] = useState(true);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        fetchCerts();
    }, [userId]);

    const fetchCerts = async () => {
        try {
            const { data, error } = await supabase
                .from('certifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCerts(data || []);
        } catch (error) {
            console.error("Error fetching certs:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCert = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const { error } = await supabase.from('certifications').insert({
                user_id: userId,
                cert_name: certName,
                issuer,
                grade_or_score: score,
                acquired_date: acquired ? date : null,
                exam_date: !acquired ? date : null,
                is_acquired: acquired,
                study_progress: acquired ? 100 : progress,
            });

            if (error) throw error;
            toast.success("자격증이 추가되었습니다.");
            setOpen(false);
            setCertName("");
            setIssuer("");
            setScore("");
            setDate("");
            setProgress(0);
            fetchCerts();
        } catch (error: any) {
            toast.error("추가 실패", { description: error.message });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("정말 삭제하시겠습니까?")) return;

        try {
            const { error } = await supabase.from('certifications').delete().eq('id', id);
            if (error) throw error;
            toast.success("삭제되었습니다.");
            setCerts(certs.filter(c => c.id !== id));
        } catch (error: any) {
            toast.error("삭제 실패", { description: error.message });
        }
    };

    if (loading) return <div className="text-center py-4 text-muted-foreground">불러오는 중...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">보유 자격증 & 목표</h3>
                <Dialog open={openOutput} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Plus className="mr-2 h-4 w-4" /> 추가
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>자격증 추가</DialogTitle>
                            <DialogDescription>
                                보유한 자격증이나 준비 중인 시험을 등록하세요.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddCert} className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">자격증명</Label>
                                <Input id="name" value={certName} onChange={e => setCertName(e.target.value)} className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="issuer" className="text-right">발급기관</Label>
                                <Input id="issuer" value={issuer} onChange={e => setIssuer(e.target.value)} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="score" className="text-right">등급/점수</Label>
                                <Input id="score" value={score} onChange={e => setScore(e.target.value)} className="col-span-3" placeholder="예: 1급, 850점" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">상태</Label>
                                <div className="flex items-center space-x-4 col-span-3">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input type="radio" checked={acquired} onChange={() => setAcquired(true)} className="accent-blue-600" />
                                        <span>취득 완료</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input type="radio" checked={!acquired} onChange={() => setAcquired(false)} className="accent-blue-600" />
                                        <span>준비 중</span>
                                    </label>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="date" className="text-right">{acquired ? "취득일" : "시험일"}</Label>
                                <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} className="col-span-3" required />
                            </div>
                            {!acquired && (
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="progress" className="text-right">학습 진행률</Label>
                                    <div className="col-span-3 flex items-center gap-2">
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={progress}
                                            onChange={(e) => setProgress(parseInt(e.target.value))}
                                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <span className="text-sm font-medium w-12 text-right">{progress}%</span>
                                    </div>
                                </div>
                            )}
                            <DialogFooter>
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "저장"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {certs.map(cert => (
                    <Card key={cert.id} className="relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-1 h-full ${cert.is_acquired ? 'bg-green-500' : 'bg-yellow-500'}`} />
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <Award className={`h-4 w-4 ${cert.is_acquired ? 'text-green-600' : 'text-yellow-600'}`} />
                                    {cert.cert_name}
                                </CardTitle>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600" onClick={() => handleDelete(cert.id)}>
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                            <CardDescription>{cert.issuer}</CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm pb-2">
                            <div className="flex justify-between mb-1">
                                <span className="text-slate-500">점수/등급</span>
                                <span className="font-medium">{cert.grade_or_score}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">{cert.is_acquired ? "취득일" : "시험일"}</span>
                                <span>{cert.acquired_date || cert.exam_date}</span>
                            </div>
                            {!cert.is_acquired && (cert as any).study_progress !== undefined && (
                                <div className="mt-2">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-500">학습 진행률</span>
                                        <span>{(cert as any).study_progress}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-yellow-500"
                                            style={{ width: `${(cert as any).study_progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
                {certs.length === 0 && (
                    <div className="col-span-full text-center py-8 text-slate-400 border border-dashed rounded-lg">
                        등록된 자격증이 없습니다.
                    </div>
                )}
            </div>
        </div>
    );
}
