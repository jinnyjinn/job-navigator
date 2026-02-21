"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
    HTMLInputElement,
    Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { onCheckedChange?: (checked: boolean) => void }
>(({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onCheckedChange?.(e.target.checked)
        props.onChange?.(e)
    }

    return (
        <label className={cn("relative inline-flex items-center cursor-pointer", disabled && "cursor-not-allowed opacity-50")}>
            <input
                type="checkbox"
                className="sr-only peer"
                ref={ref}
                disabled={disabled}
                checked={checked}
                onChange={handleChange}
                {...props}
            />
            <div className={cn(
                "w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600",
                className
            )}></div>
        </label>
    )
})
Switch.displayName = "Switch"

export { Switch }
