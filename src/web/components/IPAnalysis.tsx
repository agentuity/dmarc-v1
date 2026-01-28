/**
 * IP Analysis Component
 * Displays IP investigation results (quick check + deep analysis)
 */

interface IPAnalysisProps {
	ip: string;
	investigation: {
		quickCheckCompleted: boolean;
		quickCheckData?: {
			abuseScore?: number;
			isWhitelisted?: boolean;
			provider?: string;
			details?: {
				country?: string;
				isp?: string;
				domain?: string;
				usageType?: string;
			};
		};
		deepAnalysisCompleted: boolean;
		deepAnalysisData?: {
			summary: string;
			riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'unknown';
			recommendation: 'block' | 'monitor' | 'ignore';
			fullAnalysis: string;
		};
		error?: string;
		durationMs: number;
	};
}

export function IPAnalysis({ ip, investigation }: IPAnalysisProps) {
	const { quickCheckData, deepAnalysisData, error } = investigation;

	return (
		<div style={{
			backgroundColor: '#09090b',
			border: '1px solid #27272a',
			borderRadius: '0.5rem',
			padding: '1rem',
		}}>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
				<h4 style={{ fontSize: '1.125rem', fontWeight: '600', fontFamily: 'monospace', margin: 0 }}>
					{ip}
				</h4>
				<span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
					{investigation.durationMs}ms
				</span>
			</div>

			{error && (
				<div style={{
					padding: '0.75rem',
					backgroundColor: '#7f1d1d',
					border: '1px solid #991b1b',
					borderRadius: '0.375rem',
					color: '#fca5a5',
					fontSize: '0.875rem',
					marginBottom: '1rem',
				}}>
					<strong>Error:</strong> {error}
				</div>
			)}

			{/* Quick Check Results */}
			{quickCheckData && (
				<div style={{ marginBottom: '1rem' }}>
					<h5 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#a1a1aa', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
						Quick Check
					</h5>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', fontSize: '0.875rem' }}>
						<div>
							<span style={{ color: '#6b7280' }}>Abuse Score:</span>
							<div style={{ marginTop: '0.25rem' }}>
								{quickCheckData.abuseScore !== undefined ? (
									<AbuseScoreBadge score={quickCheckData.abuseScore} />
								) : (
									<span style={{ color: '#6b7280' }}>N/A</span>
								)}
							</div>
						</div>
						<div>
							<span style={{ color: '#6b7280' }}>Whitelisted:</span>
							<div style={{ marginTop: '0.25rem', color: quickCheckData.isWhitelisted ? '#10b981' : '#ef4444' }}>
								{quickCheckData.isWhitelisted ? 'Yes ✓' : 'No ✗'}
							</div>
						</div>
						<div>
							<span style={{ color: '#6b7280' }}>Provider:</span>
							<div style={{ marginTop: '0.25rem', color: '#fff' }}>
								{quickCheckData.provider || 'Unknown'}
							</div>
						</div>
						{quickCheckData.details?.country && (
							<div>
								<span style={{ color: '#6b7280' }}>Country:</span>
								<div style={{ marginTop: '0.25rem', color: '#fff' }}>
									{quickCheckData.details.country}
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Deep Analysis Results */}
			{deepAnalysisData && (
				<div>
					<h5 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#a1a1aa', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
						Deep Analysis
					</h5>
					<div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
						<RiskBadge level={deepAnalysisData.riskLevel} />
						<RecommendationBadge recommendation={deepAnalysisData.recommendation} />
					</div>
					<p style={{ fontSize: '0.875rem', lineHeight: '1.5', color: '#e5e5e5', margin: '0 0 0.75rem 0' }}>
						<strong style={{ color: '#fff' }}>Summary:</strong> {deepAnalysisData.summary}
					</p>
					<details>
						<summary style={{
							cursor: 'pointer',
							fontSize: '0.875rem',
							color: '#3b82f6',
							marginBottom: '0.5rem',
						}}>
							View Full Analysis
						</summary>
						<pre style={{
							marginTop: '0.5rem',
							padding: '0.75rem',
							backgroundColor: '#18181b',
							border: '1px solid #27272a',
							borderRadius: '0.375rem',
							fontSize: '0.75rem',
							lineHeight: '1.5',
							color: '#a1a1aa',
							whiteSpace: 'pre-wrap',
							overflow: 'auto',
							maxHeight: '300px',
						}}>
							{deepAnalysisData.fullAnalysis}
						</pre>
					</details>
				</div>
			)}
		</div>
	);
}

function AbuseScoreBadge({ score }: { score: number }) {
	let color = '#10b981'; // green
	let bg = '#065f46';

	if (score >= 75) {
		color = '#ef4444'; // red
		bg = '#7f1d1d';
	} else if (score >= 50) {
		color = '#f97316'; // orange
		bg = '#7c2d12';
	} else if (score >= 25) {
		color = '#fbbf24'; // yellow
		bg = '#78350f';
	}

	return (
		<span style={{
			display: 'inline-block',
			padding: '0.25rem 0.5rem',
			backgroundColor: bg,
			color,
			borderRadius: '0.25rem',
			fontSize: '0.875rem',
			fontWeight: '600',
		}}>
			{score}
		</span>
	);
}

function RiskBadge({ level }: { level: string }) {
	const colors: Record<string, { bg: string; text: string }> = {
		critical: { bg: '#7f1d1d', text: '#ef4444' },
		high: { bg: '#7c2d12', text: '#f97316' },
		medium: { bg: '#78350f', text: '#fbbf24' },
		low: { bg: '#065f46', text: '#10b981' },
		unknown: { bg: '#27272a', text: '#a1a1aa' },
	};

	const defaultColor = { bg: '#27272a', text: '#a1a1aa' };
	const color = colors[level] ?? defaultColor;

	return (
		<span style={{
			display: 'inline-block',
			padding: '0.375rem 0.75rem',
			backgroundColor: color.bg,
			color: color.text,
			borderRadius: '0.375rem',
			fontSize: '0.75rem',
			fontWeight: '600',
			textTransform: 'uppercase',
			letterSpacing: '0.05em',
		}}>
			{level}
		</span>
	);
}

function RecommendationBadge({ recommendation }: { recommendation: string }) {
	const colors: Record<string, { bg: string; text: string; icon: string }> = {
		block: { bg: '#7f1d1d', text: '#ef4444', icon: 'X' },
		monitor: { bg: '#78350f', text: '#fbbf24', icon: 'o' },
		ignore: { bg: '#065f46', text: '#10b981', icon: 'v' },
	};

	const defaultColor = { bg: '#78350f', text: '#fbbf24', icon: '?' };
	const color = colors[recommendation] ?? defaultColor;

	return (
		<span style={{
			display: 'inline-block',
			padding: '0.375rem 0.75rem',
			backgroundColor: color.bg,
			color: color.text,
			borderRadius: '0.375rem',
			fontSize: '0.75rem',
			fontWeight: '600',
			textTransform: 'uppercase',
			letterSpacing: '0.05em',
		}}>
			{color.icon} {recommendation}
		</span>
	);
}
