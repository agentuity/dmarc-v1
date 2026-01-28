/**
 * Report List Component
 * Displays table of DMARC reports with filtering and sorting
 */

import { useEffect, useState } from 'react';

interface ReportMetadata {
	reportId: string;
	timestamp: string;
	emailMetadata: {
		subject: string;
		from: string;
		date: string;
	};
	failedIPCount: number;
	investigatedIPCount: number;
	excessiveFailures: boolean;
	status: string;
}

interface ReportsResponse {
	reports: ReportMetadata[];
	total: number;
	limit: number;
	offset: number;
}

interface ReportListProps {
	filter: string;
	onSelectReport: (id: string) => void;
}

export function ReportList({ filter, onSelectReport }: ReportListProps) {
	const [data, setData] = useState<ReportsResponse | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchReports = async () => {
			setIsLoading(true);
			setError(null);
			try {
				const params = new URLSearchParams({
					filter,
					limit: '50',
					offset: '0',
				});
				const response = await fetch(`/api/reports?${params}`);
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				const result = await response.json();
				setData(result);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Unknown error');
			} finally {
				setIsLoading(false);
			}
		};
		fetchReports();
	}, [filter]);

	if (isLoading) {
		return (
			<div style={{ textAlign: 'center', padding: '3rem', color: '#a1a1aa' }}>
				Loading reports...
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

	if (!data || data.reports.length === 0) {
		return (
			<div style={{ textAlign: 'center', padding: '3rem', color: '#a1a1aa' }}>
				{filter ? `No reports found matching "${filter}"` : 'No reports found'}
			</div>
		);
	}

	return (
		<div style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '0.5rem', overflow: 'hidden' }}>
			<div style={{ overflowX: 'auto' }}>
				<table style={{ width: '100%', borderCollapse: 'collapse' }}>
					<thead>
						<tr style={{ backgroundColor: '#09090b', borderBottom: '1px solid #27272a' }}>
							<th style={tableHeaderStyle}>Report ID</th>
							<th style={tableHeaderStyle}>Date</th>
							<th style={tableHeaderStyle}>From</th>
							<th style={tableHeaderStyle}>Status</th>
							<th style={tableHeaderStyle}>Failed IPs</th>
							<th style={tableHeaderStyle}>Investigated</th>
						</tr>
					</thead>
					<tbody>
						{data.reports.map((report) => (
							<tr
								key={report.reportId}
								onClick={() => onSelectReport(report.reportId)}
								style={{
									cursor: 'pointer',
									borderBottom: '1px solid #27272a',
									transition: 'background-color 0.2s',
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.backgroundColor = '#27272a';
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor = 'transparent';
								}}
							>
								<td style={tableCellStyle}>
									<span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
										{report.reportId}
									</span>
								</td>
								<td style={tableCellStyle}>
									{new Date(report.timestamp).toLocaleDateString()} {new Date(report.timestamp).toLocaleTimeString()}
								</td>
								<td style={tableCellStyle}>
									<div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
										{report.emailMetadata.from}
									</div>
								</td>
								<td style={tableCellStyle}>
									<StatusBadge status={report.status} />
								</td>
								<td style={tableCellStyle}>
									<span style={{ color: report.failedIPCount > 0 ? '#fbbf24' : '#10b981' }}>
										{report.failedIPCount}
									</span>
								</td>
								<td style={tableCellStyle}>
									{report.investigatedIPCount > 0 ? (
										<span style={{ color: '#3b82f6' }}>{report.investigatedIPCount}</span>
									) : (
										<span style={{ color: '#6b7280' }}>-</span>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<div style={{ padding: '1rem', borderTop: '1px solid #27272a', color: '#a1a1aa', fontSize: '0.875rem' }}>
				Showing {data.reports.length} of {data.total} reports
			</div>
		</div>
	);
}

function StatusBadge({ status }: { status: string }) {
	const colors: Record<string, { bg: string; text: string }> = {
		satisfactory: { bg: '#065f46', text: '#10b981' },
		needs_attention: { bg: '#78350f', text: '#fbbf24' },
		critical: { bg: '#7f1d1d', text: '#ef4444' },
		unknown: { bg: '#27272a', text: '#a1a1aa' },
	};

	const defaultColor = { bg: '#27272a', text: '#a1a1aa' };
	const color = colors[status] ?? defaultColor;

	return (
		<span
			style={{
				display: 'inline-block',
				padding: '0.25rem 0.75rem',
				backgroundColor: color.bg,
				color: color.text,
				borderRadius: '0.375rem',
				fontSize: '0.75rem',
				fontWeight: '600',
				textTransform: 'capitalize',
			}}
		>
			{status.replace('_', ' ')}
		</span>
	);
}

const tableHeaderStyle: React.CSSProperties = {
	padding: '1rem',
	textAlign: 'left',
	fontSize: '0.875rem',
	fontWeight: '600',
	color: '#a1a1aa',
	textTransform: 'uppercase',
	letterSpacing: '0.05em',
};

const tableCellStyle: React.CSSProperties = {
	padding: '1rem',
	fontSize: '0.875rem',
	color: '#fff',
};
