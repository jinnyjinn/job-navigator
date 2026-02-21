"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { CertificationsList } from "@/components/profile/CertificationsList";
import { SkillsRadar } from "@/components/profile/SkillsRadar";
import { SettingsTab } from "@/components/profile/SettingsTab";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
    const supabase = createClient();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                router.replace('/auth');
                return;
            }
            setUser(user);

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) {
                const code = error?.code;
                if (code === 'PGRST116' || code === 'PGRST111') {
                    // Profile not found, create it
                    const { data: created, error: insertError } = await supabase
                        .from('profiles')
                        .upsert({
                            id: user.id,
                            email: user.email,
                            name: user.user_metadata?.name || user.email?.split('@')[0] || '사용자',
                            role: user.user_metadata?.role || 'student',
                        }, { onConflict: 'id' })
                        .select()
                        .single();

                    if (insertError) {
                        console.error("Profile create error:", insertError.code, insertError.message);
                        // If it's still a bigint error, it means the schema is definitely wrong
                        if (insertError.code === '22P02') {
                            toast.error("Database Schema Mismatch", {
                                description: "The 'profiles' table 'id' column should be a UUID, but it's currently a BIGINT."
                            });
                        }
                    } else {
                        setProfile(created);
                    }
                } else {
                    console.error("Profile fetch error:", code, error?.message, error?.details);
                }
            } else {
                setProfile(data);
            }
        } catch (err: any) {
            console.error("Unexpected profile error:", err?.message ?? err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="container max-w-4xl mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-8">마이 페이지</h1>

            <Tabs defaultValue="profile" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="profile">프로필</TabsTrigger>
                    <TabsTrigger value="certs">자격증</TabsTrigger>
                    <TabsTrigger value="skills">스킬</TabsTrigger>
                    <TabsTrigger value="settings">설정</TabsTrigger>
                </TabsList>

                {/* 1. Profile Tab */}
                <TabsContent value="profile">
                    <Card>
                        <CardHeader>
                            <CardTitle>프로필 정보</CardTitle>
                            <CardDescription>
                                기본 정보를 수정하고 프로필 사진을 업로드하세요.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ProfileEditForm
                                user={user}
                                profile={profile}
                                onUpdate={fetchProfile}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 2. Certifications Tab */}
                <TabsContent value="certs">
                    <Card>
                        <CardHeader>
                            <CardTitle>자격증 및 어학</CardTitle>
                            <CardDescription>
                                보유한 자격증과 어학 점수를 관리하세요.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <CertificationsList userId={user.id} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 3. Skills Tab */}
                <TabsContent value="skills">
                    <Card>
                        <CardHeader>
                            <CardTitle>스킬 체크</CardTitle>
                            <CardDescription>
                                나의 직무 역량을 시각화하여 확인하세요.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SkillsRadar userId={user.id} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 4. Settings Tab */}
                <TabsContent value="settings">
                    <Card>
                        <CardHeader>
                            <CardTitle>설정</CardTitle>
                            <CardDescription>
                                테마 설정, 비밀번호 변경, 계정 관리를 할 수 있습니다.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SettingsTab user={user} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
