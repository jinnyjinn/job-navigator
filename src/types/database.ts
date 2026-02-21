export interface DDayEvent {
    id: string;
    user_id: string;
    title: string;
    event_date: string; // ISO date string YYYY-MM-DD
    emoji?: string;
    created_at: string;
}

export type RoadmapStatus = 'prep' | 'ing' | 'done';

export interface RoadmapItem {
    id: string;
    user_id: string;
    grade: 1 | 2 | 3;
    title: string;
    description?: string;
    target_date?: string;
    status: RoadmapStatus;
    skill_tags?: string[];
    sort_order: number;
    created_at: string;
}

export type QuestCategory = 'study' | 'cert' | 'project' | 'self' | 'etc';

export interface DailyQuest {
    id: string;
    user_id: string;
    content: string;
    category: QuestCategory;
    is_completed: boolean;
    xp_earned: number;
    time_spent_min: number;
    quest_date: string; // YYYY-MM-DD
    created_at: string;
}

export type ProjectCategory = 'class' | 'project' | 'contest' | 'intern' | 'cert' | 'volunteer';

export interface Project {
    id: string;
    user_id: string;
    title: string;
    summary?: string;
    description?: string; // Markdown
    category: ProjectCategory;
    tech_tags?: string[];
    image_urls?: string[];
    thumbnail_url?: string;
    github_url?: string;
    deploy_url?: string;
    start_date?: string;
    end_date?: string;
    learnings?: string;
    achievements?: string;
    created_at: string;
}
