"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";

interface Props {
    onClose: () => void;
    onCreated: () => void;
}

function generateJoinCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function CreateClassroomModal({ onClose, onCreated }: Props) {
    const [name, setName] = useState("");
    const [grade, setGrade] = useState<number>(1);
    const [classNumber, setClassNumber] = useState<number>(1);
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error("학급 이름을 입력해주세요.");
            return;
        }

        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from("classrooms").insert({
            teacher_id: user.id,
            name: name.trim(),
            grade,
            class_number: classNumber,
            join_code: generateJoinCode(),
            is_active: true,
        });

        if (error) {
            toast.error("학급 생성에 실패했습니다: " + error.message);
        } else {
            toast.success("학급이 생성되었습니다!");
            onCreated();
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                >
                    <X className="h-5 w-5" />
                </button>
                <h2 className="text-xl font-bold mb-1">새 학급 생성</h2>
                <p className="text-sm text-slate-500 mb-6">학급 정보를 입력하면 자동으로 참여 코드가 생성됩니다.</p>

                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-slate-700">학급 이름</label>
                        <Input
                            className="mt-1"
                            placeholder="예: 2025년 1학기 진로탐색"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700">학년</label>
                            <select
                                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={grade}
                                onChange={(e) => setGrade(Number(e.target.value))}
                            >
                                <option value={1}>1학년</option>
                                <option value={2}>2학년</option>
                                <option value={3}>3학년</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700">반</label>
                            <Input
                                type="number"
                                className="mt-1"
                                min={1}
                                max={20}
                                value={classNumber}
                                onChange={(e) => setClassNumber(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                            취소
                        </Button>
                        <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700" disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "학급 생성"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
