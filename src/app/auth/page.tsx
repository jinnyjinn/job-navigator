'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from "sonner"
import { Briefcase, User, GraduationCap } from 'lucide-react';

export default function AuthPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'student' | 'teacher'>('student');
    const [name, setName] = useState('');

    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const isStudent = role === 'student';
        let loginEmail = email.trim();

        // 1. 학생이고 학번(이메일 형식이 아님)을 입력한 경우 이메일 조회 시도
        if (isStudent && !loginEmail.includes('@')) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('email')
                .eq('student_number', loginEmail)
                .eq('role', 'student')
                .maybeSingle();

            if (profile?.email) {
                loginEmail = profile.email;
            } else {
                loginEmail = `${loginEmail}@jobnavigator.com`;
            }
        }

        // 2. 로그인 시도
        let { error } = await supabase.auth.signInWithPassword({
            email: loginEmail,
            password,
        });

        // 3. 만약 도메인이 붙어서 실패했다면 원본 입력값으로 한 번 더 시도 (특히 교사 계정 등)
        if (error && loginEmail !== email.trim()) {
            const retry = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });
            error = retry.error;
        }

        if (error) {
            toast.error("로그인 실패", {
                description: "아이디(학번) 또는 비밀번호를 확인해주세요.",
            });
        } else {
            // 성공 시 역할에 맞는 페이지로 이동
            const { data: { user: loggedInUser } } = await supabase.auth.getUser();
            const userRole = loggedInUser?.user_metadata?.role || role; // 메타데이터 우선, 없으면 현재 선택된 역할
            const target = userRole === 'teacher' ? '/teacher' : '/student';

            toast.success("로그인 성공");
            window.location.href = target;
        }
        setLoading(false);
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const finalEmail = role === 'student' ? `${email}@jobnavigator.com` : email;

        const { error } = await supabase.auth.signUp({
            email: finalEmail,
            password,
            options: {
                data: {
                    name,
                    role,
                },
            },
        });

        if (error) {
            toast.error("회원가입 실패", {
                description: error.message,
            })
        } else {
            toast.success("회원가입 성공", {
                description: role === 'student' ? "이제 로그인해주세요." : "이메일 인증을 확인해주세요.",
            })

            // Redirect based on the role just used for signup
            const target = role === 'teacher' ? '/teacher' : '/student';
            window.location.href = target;
        }
        setLoading(false);
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className={`p-3 rounded-full ${role === 'teacher' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'} transition-colors duration-300`}>
                            <Briefcase className="h-8 w-8" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900">Job Navigator</CardTitle>
                    <CardDescription>
                        나의 성장을 시각화하는 취업 진로 관리 플랫폼
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div
                            className={`cursor-pointer border-2 rounded-lg p-3 text-center transition-all ${role === 'student' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-200'}`}
                            onClick={() => setRole('student')}
                        >
                            <GraduationCap className={`mx-auto h-6 w-6 mb-2 ${role === 'student' ? 'text-blue-600' : 'text-slate-400'}`} />
                            <span className={`text-sm font-medium ${role === 'student' ? 'text-blue-700' : 'text-slate-600'}`}>학생</span>
                        </div>
                        <div
                            className={`cursor-pointer border-2 rounded-lg p-3 text-center transition-all ${role === 'teacher' ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:border-purple-200'}`}
                            onClick={() => setRole('teacher')}
                        >
                            <User className={`mx-auto h-6 w-6 mb-2 ${role === 'teacher' ? 'text-purple-600' : 'text-slate-400'}`} />
                            <span className={`text-sm font-medium ${role === 'teacher' ? 'text-purple-700' : 'text-slate-600'}`}>교사</span>
                        </div>
                    </div>

                    <Tabs defaultValue="login" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="login">로그인</TabsTrigger>
                            <TabsTrigger value="signup">회원가입</TabsTrigger>
                        </TabsList>

                        <TabsContent value="login">
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">
                                        {role === 'student' ? '학번 (Student Number)' : '이메일'}
                                    </Label>
                                    <Input
                                        id="email"
                                        type={role === 'student' ? "text" : "email"}
                                        placeholder={role === 'student' ? "예: 10101" : "example@school.edu"}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">비밀번호</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <Button className={`w-full ${role === 'teacher' ? 'bg-purple-700 hover:bg-purple-800' : 'bg-blue-700 hover:bg-blue-800'}`} type="submit" disabled={loading}>
                                    {loading ? '로그인 중...' : (role === 'student' ? '학생 로그인' : '교사 로그인')}
                                </Button>
                            </form>
                        </TabsContent>

                        <TabsContent value="signup">
                            <form onSubmit={handleSignup} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="signup-name">이름</Label>
                                    <Input
                                        id="signup-name"
                                        type="text"
                                        placeholder="홍길동"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signup-email">
                                        {role === 'student' ? '학번 (Student Number)' : '이메일'}
                                    </Label>
                                    <Input
                                        id="signup-email"
                                        type={role === 'student' ? "text" : "email"}
                                        placeholder={role === 'student' ? "예: 10101" : "example@school.edu"}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signup-password">비밀번호</Label>
                                    <Input
                                        id="signup-password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>

                                <Button
                                    className={`w-full ${role === 'teacher' ? 'bg-purple-700 hover:bg-purple-800' : 'bg-blue-700 hover:bg-blue-800'}`}
                                    type="submit"
                                    disabled={loading}
                                >
                                    {loading ? '가입 처리 중...' : (role === 'teacher' ? '교사로 가입하기' : '학생으로 가입하기')}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
                <CardFooter className="text-center text-xs text-slate-500">
                    Job Navigator &copy; 2024
                </CardFooter>
            </Card>
        </div>
    );
}
