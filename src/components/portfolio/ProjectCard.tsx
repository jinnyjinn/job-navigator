"use client";

import { Project } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Github, Globe, Calendar, Tag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";

interface ProjectCardProps {
    project: Project;
    onClick: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
    const defaultThumbnail = "/placeholder-project.jpg"; // Need to handle placeholder

    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group" onClick={onClick}>
            <div className="relative h-48 w-full bg-slate-100">
                {project.thumbnail_url ? (
                    <Image
                        src={project.thumbnail_url}
                        alt={project.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                        No Image
                    </div>
                )}
                <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-slate-800">
                        {project.category}
                    </Badge>
                </div>
            </div>

            <CardHeader className="p-4 pb-2">
                <h3 className="font-bold text-lg line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {project.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                        {project.start_date ? format(new Date(project.start_date), "yyyy.MM") : "Unknown"}
                        {project.end_date && ` - ${format(new Date(project.end_date), "yyyy.MM")}`}
                    </span>
                </div>
            </CardHeader>

            <CardContent className="p-4 pt-2">
                <p className="text-sm text-slate-600 line-clamp-2 min-h-[40px]">
                    {project.summary || "No summary provided."}
                </p>
                <div className="flex flex-wrap gap-1 mt-3">
                    {project.tech_tags?.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs px-2 py-0 h-5">
                            {tag}
                        </Badge>
                    ))}
                    {(project.tech_tags?.length || 0) > 3 && (
                        <span className="text-xs text-muted-foreground self-center">
                            +{(project.tech_tags?.length || 0) - 3}
                        </span>
                    )}
                </div>
            </CardContent>

            <CardFooter className="p-4 pt-0 flex gap-3">
                {project.github_url && (
                    <Link
                        href={project.github_url}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="text-slate-400 hover:text-slate-900"
                    >
                        <Github className="h-4 w-4" />
                    </Link>
                )}
                {project.deploy_url && (
                    <Link
                        href={project.deploy_url}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="text-slate-400 hover:text-blue-600"
                    >
                        <Globe className="h-4 w-4" />
                    </Link>
                )}
            </CardFooter>
        </Card>
    );
}
