import assert from 'node:assert/strict';
import test from 'node:test';
import { MIGRATION_DURATION, MIGRATION_STAGES, migrationFrame } from '../src/migration-state.js';

test('migration tells build, check, shared handover, then retirement in order', () => {
    assert.deepEqual(MIGRATION_STAGES.map(stage => stage.id), ['build', 'check', 'share', 'retire']);
    assert.equal(MIGRATION_STAGES.at(-1).start + MIGRATION_STAGES.at(-1).duration, MIGRATION_DURATION);
    assert.deepEqual(MIGRATION_STAGES.map(stage => migrationFrame(stage.start).replacementStatus), ['building', 'ready', 'serving', 'serving']);
    assert.equal(migrationFrame(11200).existingStatus, 'retired');
    assert.equal(migrationFrame(MIGRATION_DURATION).finished, true);
});

test('customer traffic never reaches a building, merely ready, or retired system', () => {
    for (let time = 0; time <= MIGRATION_DURATION; time += 16) {
        const frame = migrationFrame(time);
        assert.ok(Math.abs(frame.existingTraffic + frame.replacementTraffic - 1) < 1e-10);
        assert.ok(frame.existingTraffic >= 0 && frame.replacementTraffic >= 0);
        if (frame.existingTraffic > 0) assert.equal(frame.existingStatus, 'serving');
        if (frame.replacementTraffic > 0) assert.equal(frame.replacementStatus, 'serving');
        if (frame.stage === 'share') assert.ok(frame.existingTraffic > 0 && frame.replacementTraffic > 0);
        if (frame.stage === 'retire') assert.equal(frame.existingTraffic, 0);
    }
});

test('handover gradually increases replacement traffic without moving system boxes', () => {
    const frames = [6400, 7600, 8800, 10000, 11199].map(migrationFrame);
    frames.forEach((frame, index) => {
        if (index) assert.ok(frame.replacementTraffic > frames[index - 1].replacementTraffic);
        assert.equal(frame.existingStatus, 'serving');
        assert.equal(frame.replacementStatus, 'serving');
    });
    assert.equal(migrationFrame(0).buildProgress, 0);
    assert.ok(migrationFrame(1600).buildProgress > 0);
    assert.equal(migrationFrame(3200).buildProgress, 1);
});

test('migration clamps seeks and completes once instead of looping', () => {
    for (const value of [-1, NaN, Infinity, undefined]) assert.equal(migrationFrame(value).elapsed, 0);
    assert.deepEqual(migrationFrame(MIGRATION_DURATION + 10000), migrationFrame(MIGRATION_DURATION));
    assert.equal(migrationFrame(MIGRATION_DURATION - 1).finished, false);
});
