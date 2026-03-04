/**
 * Main API router
 * Simple endpoint for DMARC classification + email ingestion
 */

import { createRouter } from '@agentuity/runtime';
import dmarcProcessor from '@agent/dmarc-processor';

/** Extensions we accept as DMARC report attachments */
const DMARC_EXTENSIONS = ['.xml', '.xml.gz', '.gz', '.zip'];

function isDmarcAttachment(filename: string): boolean {
	const lower = filename.toLowerCase();
	return (
		DMARC_EXTENSIONS.some((ext) => lower.endsWith(ext)) ||
		lower.includes('dmarc')
	);
}

const router = createRouter();

/**
 * HTTP POST endpoint for DMARC classification
 * Accepts either:
 * - { "records": [...] } - pre-parsed DMARC records
 * - { "file": { "content": "base64...", "filename": "report.zip" } } - zip/XML file
 */
router.post('/classify', dmarcProcessor.validator(), async (c) => {
	const logger = c.get('logger');

	try {
		const body = c.req.valid('json');

		// Log based on input type
		if ('records' in body) {
			logger.info('Starting DMARC classification with pre-parsed records', {
				recordCount: body.records.length,
			});
		} else if ('file' in body) {
			logger.info('Starting DMARC classification with file', {
				filename: body.file.filename || 'unknown',
			});
		}

		// Invoke DMARC processor agent
		const result = await dmarcProcessor.run(body);

		logger.info('Classification completed', {
			total: result.summary.total_records,
			investigate: result.summary.investigate_count,
			monitor: result.summary.monitor_count,
		});

		return c.json(result);
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error('DMARC classification failed', { error: errorMessage });
		return c.json(
			{
				success: false,
				error: errorMessage,
			},
			500
		);
	}
});

/**
 * Email ingestion endpoint for DMARC reports sent to dmarc@agentcompany.com
 * Extracts attachments, converts to base64, and runs each through dmarcProcessor
 */
router.email('dmarc@agentcompany.com', async (email, c) => {
	const logger = c.get('logger');
	logger.info('DMARC email received', {
		from: email.fromEmail(),
		subject: email.subject(),
	});

	// SDK's Email.attachments() strips content buffers — access raw mailparser attachments
	const rawAttachments = (email as any)._message.attachments as Array<{
		filename?: string;
		contentType?: string;
		content: Buffer;
	}>;

	if (!rawAttachments || rawAttachments.length === 0) {
		logger.warn('No attachments found in DMARC email');
		return c.json({ success: false, error: 'No attachments found' }, 400);
	}

	// Filter to DMARC-relevant attachments
	const dmarcAttachments = rawAttachments.filter((att) =>
		isDmarcAttachment(att.filename ?? '')
	);

	if (dmarcAttachments.length === 0) {
		logger.warn('No DMARC attachments found', {
			attachmentNames: rawAttachments.map((a) => a.filename),
		});
		return c.json({ success: false, error: 'No DMARC attachments found' }, 400);
	}

	logger.info('Processing DMARC attachments', { count: dmarcAttachments.length });

	const results = [];
	for (const att of dmarcAttachments) {
		const base64Content = Buffer.from(att.content).toString('base64');
		try {
			const result = await dmarcProcessor.run({
				file: {
					content: base64Content,
					filename: att.filename ?? 'unknown',
				},
			});
			results.push({ filename: att.filename, success: true, result });
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger.error('Failed to process attachment', {
				filename: att.filename,
				error: errorMessage,
			});
			results.push({ filename: att.filename, success: false, error: errorMessage });
		}
	}

	return c.json({
		success: true,
		from: email.fromEmail(),
		subject: email.subject(),
		attachments_processed: results.length,
		results,
	});
});

export default router;