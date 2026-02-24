import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
    // 1. 인증된 교사인지 확인
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { data: profile } = await serverSupabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!profile || profile.role !== "teacher") {
        return NextResponse.json({ error: "교사 권한이 필요합니다." }, { status: 403 });
    }

    // 2. FormData에서 파일과 userId 받기
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;

    if (!file || !userId) {
        return NextResponse.json({ error: "파일과 사용자 ID가 필요합니다." }, { status: 400 });
    }

    // 3. Service Role Key 확인
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return NextResponse.json(
            { error: "서버 환경 변수 설정 오류" },
            { status: 500 }
        );
    }

    // 4. 어드민 클라이언트 생성
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    try {
        // 5. 파일 확장자 확인
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        if (!fileExt || !['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
            return NextResponse.json({ error: "지원하지 않는 이미지 형식입니다." }, { status: 400 });
        }

        // 5-1. avatars 버킷이 없으면 자동 생성
        const { data: buckets } = await adminClient.storage.listBuckets();
        const bucketExists = buckets?.some((b) => b.id === 'avatars');
        if (!bucketExists) {
            await adminClient.storage.createBucket('avatars', { public: true });
        }

        // 6. 파일을 ArrayBuffer로 변환
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 7. Supabase Storage에 업로드
        const filePath = `${userId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await adminClient.storage
            .from('avatars')
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: true
            });

        if (uploadError) {
            console.error("Upload error:", uploadError);
            return NextResponse.json({ error: `이미지 업로드 실패: ${uploadError.message}` }, { status: 500 });
        }

        // 8. 공개 URL 가져오기
        const { data: { publicUrl } } = adminClient.storage
            .from('avatars')
            .getPublicUrl(filePath);

        // 9. profiles 테이블에 profile_image_url 업데이트 (admin client 사용 → RLS 우회)
        const { error: profileUpdateError } = await adminClient
            .from('profiles')
            .update({ profile_image_url: publicUrl })
            .eq('id', userId);

        if (profileUpdateError) {
            console.warn("프로필 이미지 URL 업데이트 실패:", profileUpdateError.message);
            // 이미지 업로드는 성공했으므로 URL은 반환 (프로필 업데이트 실패는 무시)
        }

        return NextResponse.json({ url: publicUrl });
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: `이미지 업로드 중 오류 발생: ${errorMessage}` }, { status: 500 });
    }
}
