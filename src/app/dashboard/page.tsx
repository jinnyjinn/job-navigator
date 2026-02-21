"use client";

import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        async function redirect() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace("/auth");
                return;
            }
            const role = user.user_metadata?.role || "student";
            router.replace(role === "teacher" ? "/teacher" : "/student");
        }
        redirect();
    }, []);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-50">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
    );
}
