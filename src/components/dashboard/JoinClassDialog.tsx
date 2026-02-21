"use client";

import { useState } from "react";
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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface JoinClassDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function JoinClassDialog({ open, onOpenChange, onSuccess }: JoinClassDialogProps) {
    const [loading, setLoading] = useState(false);
    const [joinCode, setJoinCode] = useState("");
    const supabase = createClient();
    const router = useRouter();

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("로그인이 필요합니다.");

            // 1. Find classroom by join code
            const { data: classroom, error: classError } = await supabase
                .from("classrooms")
                .select("id, name")
                .eq("join_code", joinCode)
                .single();

            if (classError || !classroom) {
                console.error(classError);
                throw new Error("유효하지 않은 참여 코드입니다.");
            }

            // 2. Check if already a member
            const { data: member } = await supabase
                .from("classroom_members")
                .select("*")
                .eq("classroom_id", classroom.id)
                .eq("student_id", user.id)
                .single();

            if (member) {
                throw new Error("이미 이 학급의 멤버입니다.");
            }

            // 3. Insert into classroom_members
            const { error: joinError } = await supabase
                .from("classroom_members")
                .insert({
                    classroom_id: classroom.id,
                    student_id: user.id
                });

            if (joinError) throw joinError;

            toast.success(`${classroom.name} 학급에 가입되었습니다!`);
            onSuccess();
            onOpenChange(false);
            setJoinCode("");
            router.refresh();

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>학급 참여하기</DialogTitle>
                    <DialogDescription>
                        교사로부터 받은 참여 코드를 입력하세요.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleJoin} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="code">참여 코드</Label>
                        <Input
                            id="code"
                            placeholder="예: ABC-123"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading || !joinCode}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            참여하기
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
