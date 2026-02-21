"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Loader2, Plus, Edit2, Trash2 } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface Skill {
    id: string;
    skill_name: string;
    proficiency: number;
}

export function SkillsRadar({ userId }: { userId: string }) {
    const supabase = createClient();
    const [skills, setSkills] = useState<Skill[]>([]);
    const [loading, setLoading] = useState(true);
    const [openOutput, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [currentSkill, setCurrentSkill] = useState<Skill | null>(null);
    const [skillName, setSkillName] = useState("");
    const [proficiency, setProficiency] = useState(1);

    useEffect(() => {
        fetchSkills();
    }, [userId]);

    const fetchSkills = async () => {
        try {
            const { data, error } = await supabase
                .from('skills')
                .select('*')
                .eq('user_id', userId);

            if (error) throw error;
            setSkills(data || []);
        } catch (error) {
            console.error("Error fetching skills:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSkill = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const skillData = {
                user_id: userId,
                skill_name: skillName,
                proficiency,
            };

            let error;
            if (currentSkill) {
                const { error: updateError } = await supabase
                    .from('skills')
                    .update({ proficiency, skill_name: skillName })
                    .eq('id', currentSkill.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('skills')
                    .insert(skillData);
                error = insertError;
            }

            if (error) throw error;
            toast.success(currentSkill ? "수정되었습니다." : "추가되었습니다.");
            setOpen(false);
            setCurrentSkill(null);
            setSkillName("");
            setProficiency(1);
            fetchSkills();
        } catch (error: any) {
            toast.error("저장 실패", { description: error.message });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("정말 삭제하시겠습니까?")) return;
        try {
            const { error } = await supabase.from('skills').delete().eq('id', id);
            if (error) throw error;
            toast.success("삭제되었습니다.");
            setSkills(skills.filter(s => s.id !== id));
        } catch (error: any) {
            toast.error("삭제 실패", { description: error.message });
        }
    };

    const openEdit = (skill: Skill) => {
        setCurrentSkill(skill);
        setSkillName(skill.skill_name);
        setProficiency(skill.proficiency);
        setOpen(true);
    };

    const openAdd = () => {
        setCurrentSkill(null);
        setSkillName("");
        setProficiency(3);
        setOpen(true);
    };

    if (loading) return <div className="text-center py-4">불러오는 중...</div>;

    // Transform data for recharts
    // Recharts radar needs fullAxis if few data points, but let's just pass data
    const chartData = skills.map(s => ({
        subject: s.skill_name,
        A: s.proficiency,
        fullMark: 5,
    }));

    return (
        <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="h-[300px] w-full bg-slate-50 rounded-lg p-4 flex items-center justify-center">
                {skills.length < 3 ? (
                    <div className="text-center text-slate-400">
                        <p>스킬을 3개 이상 등록하면</p>
                        <p>분석 차트가 표시됩니다.</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="subject" />
                            <PolarRadiusAxis angle={30} domain={[0, 5]} />
                            <Radar
                                name="Skills"
                                dataKey="A"
                                stroke="#8884d8"
                                fill="#8884d8"
                                fillOpacity={0.6}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                )}
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">보유 스킬</h3>
                    <Dialog open={openOutput} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={openAdd}>
                                <Plus className="mr-2 h-4 w-4" /> 추가
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{currentSkill ? "스킬 수정" : "스킬 추가"}</DialogTitle>
                                <DialogDescription>
                                    자신의 역량을 1~5점 척도로 평가하세요.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSaveSkill} className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="skill-name">스킬명</Label>
                                    <Input
                                        id="skill-name"
                                        value={skillName}
                                        onChange={e => setSkillName(e.target.value)}
                                        placeholder="예: Python, 의사소통, PPT"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label>숙련도 (1: 기초 ~ 5: 전문가)</Label>
                                        <span className="font-bold text-blue-600">{proficiency}점</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="5"
                                        step="1"
                                        value={proficiency}
                                        onChange={(e) => setProficiency(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={submitting}>
                                        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "저장"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {skills.map(skill => (
                        <div key={skill.id} className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-sm">
                            <div>
                                <div className="font-medium">{skill.skill_name}</div>
                                <div className="text-xs text-slate-500">Lv.{skill.proficiency}</div>
                            </div>
                            <div className="flex space-x-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => openEdit(skill)}>
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDelete(skill.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {skills.length === 0 && (
                        <div className="text-center py-4 text-slate-400 text-sm">등록된 스킬이 없습니다.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
