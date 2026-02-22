"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    Map,
    ScrollText,
    Archive,
    User,
    Users,
    MessageSquare,
    Settings,
    LogOut,
    BarChart2,
    BotMessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"

interface SidebarProps {
    role: "student" | "teacher"
}

export function Sidebar({ role }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut()
            window.location.href = "/auth"
        } catch (error) {
            console.error("Logout error:", error)
            window.location.href = "/auth"
        }
    }

    const studentMenu = [
        { name: "대시보드", href: "/student", icon: LayoutDashboard },
        { name: "로드맵", href: "/student/roadmap", icon: Map },
        { name: "퀘스트", href: "/student/quest", icon: ScrollText },
        { name: "포트폴리오", href: "/student/portfolio", icon: Archive },
        { name: "AI 상담", href: "/student/counseling", icon: BotMessageSquare },
        { name: "프로필", href: "/profile", icon: User },
    ]

    const teacherMenu = [
        { name: "대시보드", href: "/teacher", icon: LayoutDashboard },
        { name: "학생 관리", href: "/teacher/students", icon: Users },
        { name: "피드백", href: "/teacher/feedback", icon: MessageSquare },
        { name: "AI 상담 내역", href: "/teacher/counseling", icon: BotMessageSquare },
        { name: "데이터 분석", href: "/teacher/analytics", icon: BarChart2 },
        { name: "학급 설정", href: "/teacher/settings", icon: Settings },
        { name: "프로필", href: "/profile", icon: User },
    ]

    const menu = role === "student" ? studentMenu : teacherMenu
    const themeColor = role === "student" ? "bg-blue-600" : "bg-purple-600"
    const hoverColor = role === "student" ? "hover:bg-blue-100 text-blue-900" : "hover:bg-purple-100 text-purple-900"
    const activeColor = role === "student" ? "bg-blue-50 text-blue-700 font-semibold" : "bg-purple-50 text-purple-700 font-semibold"

    return (
        <div className="flex h-full w-64 flex-col border-r bg-background">
            <div className={cn("flex h-16 items-center justify-center px-4", themeColor)}>
                <h1 className="text-xl font-bold text-white">Job Navigator</h1>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
                <nav className="space-y-1 px-2">
                    {menu.map((item) => {
                        const isActive = item.href === "/student" || item.href === "/teacher"
                            ? pathname === item.href
                            : pathname.startsWith(item.href)
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                    isActive ? activeColor : `text-slate-600 ${hoverColor}`
                                )}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>
            </div>
            <div className="border-t p-4">
                <Button variant="ghost" className="w-full justify-start gap-3 text-slate-600 hover:text-red-600 hover:bg-red-50" onClick={handleLogout}>
                    <LogOut className="h-5 w-5" />
                    로그아웃
                </Button>
            </div>
        </div>
    )
}
