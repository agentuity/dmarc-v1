/**
 * Main API router
 * Simple endpoint for DMARC classification
 */

import { createRouter } from '@agentuity/runtime';
import dmarcProcessor from '@agent/dmarc-processor';

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

export default router;