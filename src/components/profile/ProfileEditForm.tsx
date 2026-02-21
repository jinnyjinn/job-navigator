"use client";

import { useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { User, Camera, Loader2 } from "lucide-react";

interface ProfileEditFormProps {
    user: any;
    profile: any;
    onUpdate: () => void;
}

export function ProfileEditForm({ user, profile, onUpdate }: ProfileEditFormProps) {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState(profile?.name || "");
    const [school, setSchool] = useState(profile?.school_name || "");
    const [grade, setGrade] = useState(profile?.grade || "");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const updates = {
                id: user.id,
                name,
                school_name: school,
                grade: grade ? parseInt(grade.toString()) : null,
                updated_at: new Date(),
            };

            const { error } = await supabase.from('profiles').upsert(updates);

            if (error) throw error;
            toast.success("프로필이 업데이트되었습니다.");
            onUpdate();
        } catch (error: any) {
            toast.error("업데이트 실패", { description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) {
            return;
        }

        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/${Math.random()}.${fileExt}`;

        setLoading(true);
        try {
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ profile_image_url: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            toast.success("프로필 이미지가 변경되었습니다.");
            onUpdate();
        } catch (error: any) {
            toast.error("이미지 업로드 실패", { description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleUpdate} className="space-y-6 max-w-2xl">
            <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-6">
                <div className="relative group">
                    <Avatar className="h-24 w-24 sm:h-32 sm:w-32 cursor-pointer border-4 border-white shadow-lg">
                        <AvatarImage src={profile?.profile_image_url} />
                        <AvatarFallback><User className="h-12 w-12 text-slate-400" /></AvatarFallback>
                    </Avatar>
                    <div
                        className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Camera className="h-8 w-8 text-white" />
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        disabled={loading}
                    />
                </div>
                <div className="text-center sm:text-left">
                    <h3 className="text-lg font-medium">{user.email}</h3>
                    <p className="text-sm text-slate-500">프로필 사진을 클릭하여 변경하세요.</p>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="name">이름</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} placeholder="이름을 입력하세요" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="school">학교</Label>
                    <Input id="school" value={school} onChange={(e) => setSchool(e.target.value)} disabled={loading} placeholder="학교명" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="grade">학년</Label>
                    <Input id="grade" type="number" value={grade} onChange={(e) => setGrade(e.target.value)} disabled={loading} placeholder="학년" />
                </div>
            </div>

            <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "저장하기"}
            </Button>
        </form>
    );
}
