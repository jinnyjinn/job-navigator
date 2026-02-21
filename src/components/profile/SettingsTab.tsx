"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Loader2, Download, LogOut, Moon, Sun, Lock } from "lucide-react";
import { useRouter } from "next/navigation";

export function SettingsTab({ user }: { user: any }) {
    const supabase = createClient();
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error("비밀번호가 일치하지 않습니다.");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            toast.success("비밀번호가 변경되었습니다.");
            setPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            toast.error("비밀번호 변경 실패", { description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            toast.error("로그아웃 실패");
        } else {
            router.push("/auth");
        }
    };

    const handleExportData = async () => {
        setLoading(true);
        try {
            // Fetch all user data concurrently
            const [profile, skills, certs] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', user.id).single(),
                supabase.from('skills').select('*').eq('user_id', user.id),
                supabase.from('certifications').select('*').eq('user_id', user.id)
            ]);

            const exportData = {
                user: { email: user.email, id: user.id },
                profile: profile.data,
                skills: skills.data,
                certifications: certs.data,
                exported_at: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `job-navigator-export-${user.id.slice(0, 8)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success("데이터 내보내기 완료");
        } catch (error) {
            console.error(error);
            toast.error("데이터 내보내기 실패");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Theme Settings */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">화면 설정</h3>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                        <span>다크 모드</span>
                    </div>
                    <Switch
                        checked={theme === 'dark'}
                        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                    />
                </div>
            </div>

            {/* Account Settings */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">계정 보안</h3>
                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                    <div className="space-y-2">
                        <Label htmlFor="new-password">새 비밀번호</Label>
                        <Input
                            id="new-password"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="변경할 비밀번호 입력"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">비밀번호 확인</Label>
                        <Input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                        />
                    </div>
                    <Button type="submit" disabled={loading || !password}>
                        {loading && password ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                        비밀번호 변경
                    </Button>
                </form>
            </div>

            {/* Data Management */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium border-b pb-2">데이터 관리</h3>
                <div className="flex flex-col space-y-2">
                    <p className="text-sm text-slate-500 mb-2">
                        개인 데이터를 JSON 형식으로 내려받을 수 있습니다.
                    </p>
                    <div>
                        <Button variant="outline" onClick={handleExportData} disabled={loading}>
                            <Download className="mr-2 h-4 w-4" /> 데이터 내보내기
                        </Button>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="pt-8 border-t">
                <Button variant="destructive" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" /> 로그아웃
                </Button>
            </div>
        </div>
    );
}
