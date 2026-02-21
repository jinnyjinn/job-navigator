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
    BarChart2,
} from "lucide-react"

interface MobileTabsProps {
    role: "student" | "teacher"
}

export function MobileTabs({ role }: MobileTabsProps) {
    const pathname = usePathname()

    const studentMenu = [
        { name: "홈", href: "/student", icon: LayoutDashboard },
        { name: "로드맵", href: "/student/roadmap", icon: Map },
        { name: "퀘스트", href: "/student/quest", icon: ScrollText },
        { name: "포트폴리오", href: "/student/portfolio", icon: Archive },
        { name: "내정보", href: "/profile", icon: User },
    ]

    const teacherMenu = [
        { name: "홈", href: "/teacher", icon: LayoutDashboard },
        { name: "학생", href: "/teacher/students", icon: Users },
        { name: "피드백", href: "/teacher/feedback", icon: MessageSquare },
        { name: "분석", href: "/teacher/analytics", icon: BarChart2 },
        { name: "설정", href: "/teacher/settings", icon: Settings },
    ]

    const menu = role === "student" ? studentMenu : teacherMenu
    const activeColor = role === "student" ? "text-blue-600" : "text-purple-600"

    return (
        <div className="fixed bottom-0 left-0 z-50 w-full border-t bg-background flex h-16 items-center justify-around px-2 md:hidden">
            {menu.map((item) => {
                const isActive = item.href === "/student" || item.href === "/teacher"
                    ? pathname === item.href
                    : pathname.startsWith(item.href)
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 text-[10px]",
                            isActive ? activeColor : "text-slate-500"
                        )}
                    >
                        <item.icon className="h-6 w-6" />
                        <span>{item.name}</span>
                    </Link>
                )
            })}
        </div>
    )
}
