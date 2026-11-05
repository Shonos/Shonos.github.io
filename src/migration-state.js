// The illustration's routing contract. Fractions describe the animation only,
// never a measured production split. This module has no DOM or clock side effects.
export const MIGRATION_STAGES = Object.freeze([
    Object.freeze({ id: 'build', start: 0, duration: 3200 }),
    Object.freeze({ id: 'check', start: 3200, duration: 3200 }),
    Object.freeze({ id: 'share', start: 6400, duration: 4800 }),
    Object.freeze({ id: 'retire', start: 11200, duration: 3200 })
]);
export const MIGRATION_DURATION = 14400;

export function migrationFrame(time = 0) {
    const elapsed = Math.max(0, Math.min(MIGRATION_DURATION, Number.isFinite(time) ? time : 0));
    const index = MIGRATION_STAGES.findLastIndex(stage => elapsed >= stage.start);
    const stage = MIGRATION_STAGES[index];
    const progress = Math.min(1, (elapsed - stage.start) / stage.duration);
    const replacementTraffic = index < 2 ? 0 : index === 2 ? 0.15 + 0.7 * progress : 1;
    return {
        elapsed, index, stage: stage.id, progress, finished: elapsed === MIGRATION_DURATION,
        existingStatus: index === 3 ? 'retired' : 'serving',
        replacementStatus: ['building', 'ready', 'serving', 'serving'][index],
        existingTraffic: 1 - replacementTraffic, replacementTraffic,
        buildProgress: index === 0 ? progress : 1
    };
}
