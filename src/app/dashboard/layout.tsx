"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function DashboardRedirectLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [role, setRole] = useState<"student" | "teacher">("student");

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user?.user_metadata?.role === "teacher") setRole("teacher");
        });
    }, []);

    return <DashboardLayout role={role}>{children}</DashboardLayout>;
}
