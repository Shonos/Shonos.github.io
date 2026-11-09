// An illustrative handoff contract, not an agent runner. No DOM, clock, or network
// side effects: every route is finite and every agent exchange crosses the hub.
export const AGENT_WORKFLOW_NODES = Object.freeze([
    'developer', 'orchestrator', 'planner', 'researcher', 'builders', 'testers'
]);

export const AGENT_WORKFLOW_EDGES = Object.freeze(
    AGENT_WORKFLOW_NODES.filter(node => node !== 'orchestrator').flatMap(node => [
        Object.freeze({ id: `${node}-orchestrator`, from: node, to: 'orchestrator' }),
        Object.freeze({ id: `orchestrator-${node}`, from: 'orchestrator', to: node })
    ])
);

function route(definitions) {
    let start = 0;
    const stages = definitions.map(([id, from, to, duration]) => {
        const stage = Object.freeze({ id, from, to, activeNode: to,
            edge: from ? `${from}-${to}` : null, start, duration });
        start += duration;
        return stage;
    });
    return Object.freeze({ stages: Object.freeze(stages), duration: start });
}

const beginning = [
    ['brief', 'developer', 'orchestrator', 1400],
    ['plan', 'orchestrator', 'planner', 1800]
];
const delivery = [
    ['build', 'orchestrator', 'builders', 2000],
    ['implementation', 'builders', 'orchestrator', 1400],
    ['test', 'orchestrator', 'testers', 1800],
    ['verification', 'testers', 'orchestrator', 1400],
    ['review', 'orchestrator', 'developer', 1600],
    ['approval', null, 'developer', 1200]
];

export const AGENT_WORKFLOW_ROUTES = Object.freeze({
    'ready-to-build': route([
        ...beginning,
        ['plan-ready', 'planner', 'orchestrator', 1400],
        ...delivery
    ]),
    'need-more-context': route([
        ...beginning,
        ['context-needed', 'planner', 'orchestrator', 1400],
        ['research', 'orchestrator', 'researcher', 1800],
        ['findings', 'researcher', 'orchestrator', 1400],
        ['replan', 'orchestrator', 'planner', 1800],
        ['revised-plan', 'planner', 'orchestrator', 1400],
        ...delivery
    ])
});

export function agentWorkflowFrame(routeId = 'ready-to-build', time = 0) {
    if (!Object.hasOwn(AGENT_WORKFLOW_ROUTES, routeId)) throw new RangeError(`Unknown workflow route: ${routeId}`);
    const { stages, duration } = AGENT_WORKFLOW_ROUTES[routeId];
    const elapsed = Math.max(0, Math.min(duration, Number.isFinite(time) ? time : 0));
    const index = stages.findLastIndex(stage => elapsed >= stage.start);
    const stage = stages[index];
    const progress = Math.min(1, (elapsed - stage.start) / stage.duration);
    const research = routeId === 'ready-to-build' ? 'skipped' :
        index < 2 ? 'conditional' : index < 6 ? 'requested' : 'incorporated';
    return {
        route: routeId, elapsed, duration, index, stage: stage.id, progress,
        from: stage.from, to: stage.to, edge: stage.edge, activeNode: stage.activeNode,
        handoffProgress: Math.min(1, progress / 0.72), research,
        replanned: routeId === 'need-more-context' && index >= 6,
        finished: elapsed === duration
    };
}
