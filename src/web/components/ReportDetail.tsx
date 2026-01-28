/**
 * Report Detail Component
 * Displays full DMARC report with analyses and IP investigations
 */

import { useEffect, useState } from 'react';
import { IPAnalysis } from './IPAnalysis';

interface IPInvestigation {
	ip: string;
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
}

interface DMARCReport {
	reportId: string;
	timestamp: string;
	emailMetadata: {
		subject: string;
		from: string;
		date: string;
	};
	summary: string;
	failedIPs: Array<{
		ip: string;
		count: number;
		spfResult: string;
		dkimResult: string;
	}>;
	ipInvestigations: Record<string, IPInvestigation>;
	analyses: Array<{
		conclusion?: {
			status: string;
		};
		[key: string]: unknown;
	}>;
}

interface ReportDetailProps {
	reportId: string;
	onBack: () => void;
}

export function ReportDetail({ reportId, onBack }: ReportDetailProps) {
	const [report, setReport] = useState<DMARCReport | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchReport = async () => {
			setIsLoading(true);
			setError(null);
			try {
				const response = await fetch(`/api/reports/${encodeURIComponent(reportId)}`);
				if (!response.ok) {
					if (response.status === 404) {
						throw new Error('Report not found');
					}
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				const result = await response.json();
				setReport(result);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Unknown error');
			} finally {
				setIsLoading(false);
			}
		};
		fetchReport();
	}, [reportId]);

	if (isLoading) {
		return (
			<div style={{ textAlign: 'center', padding: '3rem', color: '#a1a1aa' }}>
				Loading report details...
			</div>
		);
	}

	if (error) {
		return (
			<div style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>
				Error: {error}
			</div>
		);
	}

	if (!report) {
		return (
			<div style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>
				Report not found
			</div>
		);
	}

	return (
		<div>
			<button
				onClick={onBack}
				style={{
					marginBottom: '1.5rem',
					padding: '0.5rem 1rem',
					backgroundColor: '#18181b',
					border: '1px solid #27272a',
					borderRadius: '0.375rem',
					color: '#fff',
					cursor: 'pointer',
					fontSize: '0.875rem',
				}}
			>
				Back to List
			</button>

			<div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
				{/* Report Header */}
				<section style={cardStyle}>
					<h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
						Report: {report.reportId}
					</h2>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', color: '#a1a1aa', fontSize: '0.875rem' }}>
						<div>
							<strong style={{ color: '#fff' }}>Subject:</strong>
							<div>{report.emailMetadata.subject}</div>
						</div>
						<div>
							<strong style={{ color: '#fff' }}>From:</strong>
							<div>{report.emailMetadata.from}</div>
						</div>
						<div>
							<strong style={{ color: '#fff' }}>Date:</strong>
							<div>{new Date(report.emailMetadata.date).toLocaleString()}</div>
						</div>
						<div>
							<strong style={{ color: '#fff' }}>Failed IPs:</strong>
							<div style={{ color: report.failedIPs.length > 0 ? '#fbbf24' : '#10b981' }}>
								{report.failedIPs.length}
							</div>
						</div>
					</div>
				</section>

				{/* Summary */}
				<section style={cardStyle}>
					<h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
						Summary
					</h3>
					<pre style={{
						backgroundColor: '#09090b',
						padding: '1rem',
						borderRadius: '0.375rem',
						border: '1px solid #27272a',
						whiteSpace: 'pre-wrap',
						fontSize: '0.875rem',
						lineHeight: '1.5',
						color: '#e5e5e5',
					}}>
						{report.summary}
					</pre>
				</section>

				{/* IP Investigations */}
				{Object.keys(report.ipInvestigations).length > 0 && (
					<section style={cardStyle}>
						<h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
							IP Investigations ({Object.keys(report.ipInvestigations).length})
						</h3>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
							{Object.entries(report.ipInvestigations).map(([ip, investigation]) => (
								<IPAnalysis key={ip} ip={ip} investigation={investigation} />
							))}
						</div>
					</section>
				)}

				{/* Detailed Analyses */}
				<section style={cardStyle}>
					<h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
						Detailed Analyses
					</h3>
					{report.analyses.map((analysis, idx) => (
						<details key={idx} style={{ marginBottom: '1rem' }}>
							<summary style={{
								cursor: 'pointer',
								padding: '0.75rem',
								backgroundColor: '#09090b',
								borderRadius: '0.375rem',
								border: '1px solid #27272a',
								fontWeight: '600',
							}}>
								Report {idx + 1} - {analysis.conclusion?.status || 'Unknown'}
							</summary>
							<div style={{
								marginTop: '0.5rem',
								padding: '1rem',
								backgroundColor: '#09090b',
								borderRadius: '0.375rem',
								border: '1px solid #27272a',
							}}>
								<pre style={{
									whiteSpace: 'pre-wrap',
									fontSize: '0.75rem',
									lineHeight: '1.5',
									color: '#a1a1aa',
									margin: 0,
								}}>
									{JSON.stringify(analysis, null, 2)}
								</pre>
							</div>
						</details>
					))}
				</section>
			</div>
		</div>
	);
}

const cardStyle: React.CSSProperties = {
	backgroundColor: '#18181b',
	border: '1px solid #27272a',
	borderRadius: '0.5rem',
	padding: '1.5rem',
};
