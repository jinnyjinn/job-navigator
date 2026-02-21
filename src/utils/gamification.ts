export const calculateLevel = (xp: number) => {
    // Simple logic: Level 1 (0-1000), Level 2 (1001-2000), etc.
    // Level = floor(xp / 1000) + 1
    if (xp < 0) return 1;
    return Math.floor(xp / 1000) + 1;
};

export const calculateNextLevelXP = (currentLevel: number) => {
    return currentLevel * 1000;
};

export const calculateProgress = (xp: number) => {
    const currentLevel = calculateLevel(xp);
    const prevLevelXP = (currentLevel - 1) * 1000;
    const nextLevelXP = currentLevel * 1000;
    const currentLevelXP = xp - prevLevelXP;
    const levelRange = nextLevelXP - prevLevelXP;

    return Math.min(100, Math.max(0, (currentLevelXP / levelRange) * 100));
};

export const GENERIC_LEVEL_TITLES = [
    "Novice Navigator",
    "Apprentice Explorer",
    "Journeyman Pathfinder",
    "Expert Voyager",
    "Master Guide",
    "Grandmaster Wayfinder",
    "Legendary Navigator"
];

export const getLevelTitle = (level: number) => {
    const index = Math.min(level - 1, GENERIC_LEVEL_TITLES.length - 1);
    return GENERIC_LEVEL_TITLES[Math.max(0, index)];
};
