import assert from 'node:assert/strict';
import test from 'node:test';
import { AGENT_WORKFLOW_EDGES, AGENT_WORKFLOW_NODES, AGENT_WORKFLOW_ROUTES, agentWorkflowFrame } from '../src/agent-workflow-state.js';

test('both illustrative workflow routes are finite and end at developer approval', () => {
    assert.equal(AGENT_WORKFLOW_ROUTES['ready-to-build'].stages.length, 9);
    assert.equal(AGENT_WORKFLOW_ROUTES['ready-to-build'].duration, 14000);
    assert.equal(AGENT_WORKFLOW_ROUTES['need-more-context'].stages.length, 13);
    assert.equal(AGENT_WORKFLOW_ROUTES['need-more-context'].duration, 20400);
    for (const [id, route] of Object.entries(AGENT_WORKFLOW_ROUTES)) {
        assert.equal(route.stages[0].start, 0);
        assert.equal(new Set(route.stages.map(stage => stage.id)).size, route.stages.length);
        route.stages.forEach((stage, index) => {
            assert.ok(stage.duration > 0);
            if (index) assert.equal(stage.start, route.stages[index - 1].start + route.stages[index - 1].duration);
        });
        assert.equal(route.stages.at(-1).start + route.stages.at(-1).duration, route.duration);
        const last = agentWorkflowFrame(id, route.duration);
        assert.equal(last.stage, 'approval');
        assert.equal(last.activeNode, 'developer');
        assert.equal(last.edge, null);
        assert.equal(last.finished, true);
        assert.deepEqual(agentWorkflowFrame(id, route.duration + 100000), last);
    }
});

test('every explicit handoff crosses the orchestrator and each specialist returns through it', () => {
    assert.equal(AGENT_WORKFLOW_NODES.length, 6);
    assert.equal(AGENT_WORKFLOW_EDGES.length, 10);
    for (const edge of AGENT_WORKFLOW_EDGES) {
        assert.equal(edge.id, `${edge.from}-${edge.to}`);
        assert.ok(edge.from === 'orchestrator' || edge.to === 'orchestrator');
        assert.notEqual(edge.from, edge.to);
        assert.ok(AGENT_WORKFLOW_NODES.includes(edge.from));
        assert.ok(AGENT_WORKFLOW_NODES.includes(edge.to));
    }
    for (const [id, route] of Object.entries(AGENT_WORKFLOW_ROUTES)) {
        route.stages.forEach((stage, index) => {
            const frame = agentWorkflowFrame(id, stage.start);
            assert.equal(frame.activeNode, stage.to);
            if (!stage.edge) return;
            assert.ok(AGENT_WORKFLOW_EDGES.some(edge => edge.id === stage.edge && edge.from === stage.from && edge.to === stage.to));
            if (stage.to !== 'orchestrator' && stage.to !== 'developer') {
                assert.equal(route.stages[index + 1].from, stage.to);
                assert.equal(route.stages[index + 1].to, 'orchestrator');
            }
            if (index && stage.from !== null) assert.equal(stage.from, route.stages[index - 1].to);
        });
    }
});

test('ready-to-build skips research and sends the returned plan through build, test, and review', () => {
    const route = AGENT_WORKFLOW_ROUTES['ready-to-build'];
    assert.deepEqual(route.stages.map(stage => stage.id), [
        'brief', 'plan', 'plan-ready', 'build', 'implementation', 'test', 'verification', 'review', 'approval'
    ]);
    for (let time = 0; time <= route.duration; time += 16) {
        const frame = agentWorkflowFrame('ready-to-build', time);
        assert.equal(frame.research, 'skipped');
        assert.equal(frame.replanned, false);
        assert.notEqual(frame.activeNode, 'researcher');
    }
});

test('missing context returns through research and re-planning exactly once before building', () => {
    const id = 'need-more-context';
    const route = AGENT_WORKFLOW_ROUTES[id];
    assert.deepEqual(route.stages.slice(2, 7).map(stage => [stage.id, stage.from, stage.to]), [
        ['context-needed', 'planner', 'orchestrator'],
        ['research', 'orchestrator', 'researcher'],
        ['findings', 'researcher', 'orchestrator'],
        ['replan', 'orchestrator', 'planner'],
        ['revised-plan', 'planner', 'orchestrator']
    ]);
    assert.equal(route.stages.filter(stage => stage.to === 'researcher').length, 1);
    assert.equal(route.stages.filter(stage => stage.id === 'replan').length, 1);
    route.stages.forEach((stage, index) => {
        const frame = agentWorkflowFrame(id, stage.start);
        assert.equal(frame.research, index < 2 ? 'conditional' : index < 6 ? 'requested' : 'incorporated');
        assert.equal(frame.replanned, index >= 6);
        if (['builders', 'testers', 'developer'].includes(frame.activeNode)) assert.equal(frame.replanned, true);
    });
});

test('seeking is deterministic and clamped, with exact stage boundaries and bounded signal progress', () => {
    for (const [id, route] of Object.entries(AGENT_WORKFLOW_ROUTES)) {
        for (const value of [-10, NaN, Infinity, -Infinity, undefined]) assert.equal(agentWorkflowFrame(id, value).elapsed, 0);
        route.stages.forEach((stage, index) => {
            const frame = agentWorkflowFrame(id, stage.start);
            assert.equal(frame.index, index);
            assert.equal(frame.progress, 0);
            if (index) assert.equal(agentWorkflowFrame(id, stage.start - 1).index, index - 1);
        });
        for (let time = 0; time <= route.duration; time += 16) {
            const frame = agentWorkflowFrame(id, time);
            assert.deepEqual(agentWorkflowFrame(id, time), frame);
            assert.ok(frame.progress >= 0 && frame.progress <= 1);
            assert.ok(frame.handoffProgress >= 0 && frame.handoffProgress <= 1);
            assert.equal(frame.finished, time === route.duration);
        }
    }
    assert.throws(() => agentWorkflowFrame('unknown'), RangeError);
    assert.throws(() => agentWorkflowFrame('__proto__'), RangeError);
    assert.equal(agentWorkflowFrame().route, 'ready-to-build');
});

test('published workflow contracts cannot be mutated by a renderer or validator', () => {
    assert.ok(Object.isFrozen(AGENT_WORKFLOW_NODES));
    assert.ok(Object.isFrozen(AGENT_WORKFLOW_EDGES));
    assert.ok(AGENT_WORKFLOW_EDGES.every(Object.isFrozen));
    assert.ok(Object.isFrozen(AGENT_WORKFLOW_ROUTES));
    Object.values(AGENT_WORKFLOW_ROUTES).forEach(route => {
        assert.ok(Object.isFrozen(route));
        assert.ok(Object.isFrozen(route.stages));
        assert.ok(route.stages.every(Object.isFrozen));
    });
});
