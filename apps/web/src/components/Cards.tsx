import { memo, useRef, type ReactElement } from 'react';
import type { Answer, Cards as CardData, RunPresentation } from '../fixture/adapter.ts';
import { runById } from '../projection.ts';
import { useSelector, type Store } from '../store.ts';

const glyphs: Record<string, string> = { pass: '✓', fail: '✕', blocked: '⊘', unavailable: '?', infrastructure_error: '!', running: '▶', queued: '…', succeeded: '✓', failed: '✕', proposed: '○', waiting_for_other_reviewer: '⏳' };
const glyph = (state: string): string => glyphs[state] ?? '•';

export function Badge({ state, live = false }: { readonly state: string; readonly live?: boolean }): ReactElement {
	return <span className={live ? 'badge live' : 'badge'} data-state={state}><span aria-hidden="true">{glyph(state)} </span>{state.replaceAll('_', ' ')}</span>;
}

// Controls that would need service authority are focusable, explicitly labelled unavailable, and only report why.
export function Unavailable({ action, reason, onExplain }: { readonly action: string; readonly reason: string; readonly onExplain: (text: string) => void }): ReactElement {
	return <button type="button" aria-disabled="true" className="unavailable" onClick={() => { onExplain(`${action}: unavailable in this fixture. ${reason}`); }}>{action} (unavailable)</button>;
}

interface RunCardProps { readonly store: Store; readonly streamId: string; readonly runId: string; readonly shown: RunPresentation | undefined; readonly onExplain: (text: string) => void }
// Subscribes to one run reference only; an update to another run or any message leaves this card untouched.
export const RunCard = memo(function RunCard({ store, streamId, runId, shown, onExplain }: RunCardProps): ReactElement {
	const run = useSelector(store, (state) => runById(state.rooms.find((r) => r.streamId === streamId), runId));
	const commits = useRef(0);
	commits.current += 1;
	if (!run) return <article className="card" aria-label="Run card unavailable"><p>Run {runId} is not in the snapshot.</p></article>;
	const live = run.state === 'running';
	return (
		<article className="card" aria-label={`Run card, ${run.state}, revision ${run.revision}`} data-run-id={run.id} data-revision={run.revision} data-commits={commits.current}>
			<p className="kicker">Run card · revision {run.revision}</p>
			<Badge state={run.state} live={live} />
			<dl>
				<dt>Owner</dt><dd>{shown?.owner ?? 'unknown'}</dd>
				<dt>Delegate</dt><dd>{shown?.delegate ?? 'unknown'}</dd>
				<dt>Placement</dt><dd>{shown?.placement ?? 'unknown'}</dd>
				<dt>Authority</dt><dd>current state from the projected run revision, never from prose</dd>
			</dl>
			<Unavailable action="Cancel run" reason="No control service exists; no cancel authority is wired." onExplain={onExplain} />
		</article>
	);
});

export function CenterAnswer({ answer, onCite }: { readonly answer: Answer; readonly onCite: (messageId: string) => void }): ReactElement {
	return (
		<article className="card" aria-label={`${answer.agent} answer, ${answer.state}`}>
			<p className="kicker">{answer.agent} · read-only · {answer.state === 'committed' ? 'committed answer' : 'provisional stream'}</p>
			<p className={answer.state === 'provisional' ? 'provisional' : undefined}>{answer.body}</p>
			<p className="kicker">Citations</p>
			<ul className="citations">
				{answer.citations.map((c, i) => c.kind === 'message'
					? <li key={i}><button type="button" onClick={() => { onCite(c.id); }}>{c.label} (message revision)</button></li>
					: <li key={i}><span>{c.text}</span> <span className="kicker">unresolved, plain text</span></li>)}
			</ul>
			<p className="kicker">Cost: {answer.cost}</p>
		</article>
	);
}

export function TaskCard({ card, onExplain }: { readonly card: CardData['task']; readonly onExplain: (text: string) => void }): ReactElement {
	return (
		<article className="card" aria-label={`Task card, ${card.state}`}>
			<p className="kicker">Task card</p>
			<h3>{card.title}</h3>
			<Badge state={card.state} />
			<dl><dt>Owner</dt><dd>{card.owner}</dd><dt>Executing</dt><dd>{card.executor}</dd><dt>Attempts</dt><dd>{card.attempts}</dd></dl>
			<Unavailable action="Launch" reason="Launch needs a bound machine, budget and approval from the control service." onExplain={onExplain} />
		</article>
	);
}

export function EvidenceCard({ card }: { readonly card: CardData['evidence'] }): ReactElement {
	return (
		<article className="card" aria-label={`Evidence card, ${card.validation}, ${card.trust.replaceAll('_', ' ')}`}>
			<p className="kicker">Evidence card · {card.trust.replaceAll('_', ' ')} · {card.validation}</p>
			<dl><dt>Head</dt><dd className="digest">{card.head}</dd><dt>Base</dt><dd className="digest">{card.base}</dd></dl>
			<ul aria-label="Check outcomes">{card.checks.map((check) => <li key={check.name}>{check.name}: <Badge state={check.outcome} /></li>)}</ul>
		</article>
	);
}

export function ApprovalCard({ card, onExplain }: { readonly card: CardData['approval']; readonly onExplain: (text: string) => void }): ReactElement {
	return (
		<article className="card" aria-label={`Approval card, ${card.state.replaceAll('_', ' ')}`}>
			<p className="kicker">Approval card</p>
			<Badge state={card.state} />
			<dl><dt>Bound subject</dt><dd className="digest">{card.subject}</dd><dt>Eligible decider</dt><dd>{card.decider}</dd><dt>Expires</dt><dd><time dateTime={card.expires}>{card.expires}</time></dd></dl>
			<Unavailable action="Grant" reason="Approval binds a real head and decider; no authorization service exists here." onExplain={onExplain} />
			<Unavailable action="Deny" reason="Approval binds a real head and decider; no authorization service exists here." onExplain={onExplain} />
		</article>
	);
}
