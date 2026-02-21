"use client"

import { Sidebar } from "./Sidebar"
import { MobileTabs } from "./MobileTabs"

interface DashboardLayoutProps {
    children: React.ReactNode
    role: "student" | "teacher"
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
    return (
        <div className="flex h-screen w-full bg-slate-50">
            {/* Desktop Sidebar */}
            <div className="hidden md:flex">
                <Sidebar role={role} />
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
                <div className="h-full p-4 md:p-8">
                    {children}
                </div>
            </main>

            {/* Mobile Tabs */}
            <div className="md:hidden">
                <MobileTabs role={role} />
            </div>
        </div>
    )
}
