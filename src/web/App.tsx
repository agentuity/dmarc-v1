/**
 * DMARC Report Manager - Main Application
 */

import { useState } from 'react';
import { ReportList } from './components/ReportList.tsx';
import { ReportDetail } from './components/ReportDetail.tsx';

export function App() {
	const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
	const [filter, setFilter] = useState('');

	return (
		<div style={{ minHeight: '100vh', backgroundColor: '#09090b', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
			<div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
				<header style={{ marginBottom: '2rem', borderBottom: '1px solid #27272a', paddingBottom: '1rem' }}>
					<h1 style={{ fontSize: '2rem', fontWeight: '600', margin: 0 }}>
						📧 DMARC Report Manager
					</h1>
					<p style={{ color: '#a1a1aa', marginTop: '0.5rem' }}>
						View and analyze DMARC aggregate reports with IP threat intelligence
					</p>
				</header>

				{selectedReportId ? (
					<ReportDetail
						reportId={selectedReportId}
						onBack={() => setSelectedReportId(null)}
					/>
				) : (
					<>
						<div style={{ marginBottom: '1.5rem' }}>
							<input
								type="text"
								placeholder="Filter by domain, org, or report ID..."
								value={filter}
								onChange={(e) => setFilter(e.target.value)}
								style={{
									width: '100%',
									padding: '0.75rem 1rem',
									backgroundColor: '#18181b',
									border: '1px solid #27272a',
									borderRadius: '0.5rem',
									color: '#fff',
									fontSize: '1rem',
								}}
							/>
						</div>
						<ReportList
							filter={filter}
							onSelectReport={setSelectedReportId}
						/>
					</>
				)}
			</div>
		</div>
	);
}
