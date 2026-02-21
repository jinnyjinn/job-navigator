export function getTimeAgo(dateStr: string | null | undefined): string {
    if (!dateStr) return '활동 없음';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return `${Math.floor(diffDays / 7)}주 전`;
}

export function getStudentStatus(lastActiveDate: string | null | undefined): 'online' | 'active' | 'offline' | 'inactive' {
    if (!lastActiveDate) return 'inactive';
    const diffDays = Math.floor(
        (Date.now() - new Date(lastActiveDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays < 1) return 'online';
    if (diffDays < 3) return 'active';
    if (diffDays < 7) return 'offline';
    return 'inactive';
}
