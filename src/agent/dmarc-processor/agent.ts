/**
 * DMARC Processor Agent
 * Classifies DMARC records using LLM and outputs structured results
 */

import { createAgent, type AgentContext } from '@agentuity/runtime';
import { DmarcProcessorInputSchema, DmarcProcessorOutputSchema } from './schema';
import { classifyDmarcRecords } from '@lib/dmarc-classifier';
import { sendToSlack } from '@lib/slack';
import { parseDmarcInput, type ParsedDmarcReport } from '@lib/dmarc-parser';
import type { DmarcRecord } from '@lib/classification-types';

const agent = createAgent('dmarc-processor', {
	description: 'Classifies DMARC aggregate report records and outputs structured JSON',
	schema: {
		input: DmarcProcessorInputSchema,
		output: DmarcProcessorOutputSchema,
	},
	handler: async (ctx: AgentContext, input) => {
		try {
			let records: DmarcRecord[];
			let reportMetadata: ParsedDmarcReport['metadata'] | undefined;

			// Determine input type and extract records
			if ('records' in input) {
				// Mode 1: Pre-parsed records
				ctx.logger.info('Processing pre-parsed DMARC records', {
					recordCount: input.records.length,
				});
				records = input.records;
			} else if ('file' in input) {
				// Mode 2: Parse from file (zip, gzip, or XML)
				ctx.logger.info('Parsing DMARC file', {
					filename: input.file.filename || 'unknown',
				});

				const parsed = await parseDmarcInput({
					base64Content: input.file.content,
				});

				ctx.logger.info('DMARC file parsed successfully', {
					recordCount: parsed.records.length,
					reportId: parsed.metadata.reportId,
					orgName: parsed.metadata.orgName,
				});

				records = parsed.records;
				reportMetadata = parsed.metadata;
			} else {
				throw new Error('Invalid input: must provide either "records" or "file"');
			}

			ctx.logger.info('Starting DMARC classification', {
				recordCount: records.length,
			});

			// Run LLM classification
			const classification = await classifyDmarcRecords(records);

			ctx.logger.info('Classification complete', {
				total: classification.summary.total_records,
				investigate: classification.summary.investigate_count,
				monitor: classification.summary.monitor_count,
				allPassing: classification.summary.all_passing,
			});

			// Send to Slack
			let slackDelivered = false;
			try {
				const message = formatSlackMessage(classification);
				await sendToSlack(message, ctx.logger);
				slackDelivered = true;
				ctx.logger.info('Slack notification sent');
			} catch (slackError) {
				ctx.logger.warn('Failed to send Slack notification', {
					error: slackError instanceof Error ? slackError.message : String(slackError),
				});
			}

			// Store results in KV for later retrieval
			if (reportMetadata) {
				try {
					const domain = records[0]?.identifiers?.header_from || 'unknown';
					const org = reportMetadata.orgName || 'unknown';
					const reportId = reportMetadata.reportId || Date.now().toString();
					const kvKey = `${domain}_${org}_${reportId}`;

					await ctx.kv.set('dmarc-reports', kvKey, {
						summary: classification.summary,
						investigation_queue: classification.investigation_queue,
						metadata: reportMetadata,
						processed_at: new Date().toISOString(),
					});

					ctx.logger.info('DMARC report stored in KV', { key: kvKey });
				} catch (kvError) {
					ctx.logger.warn('Failed to store DMARC report in KV', {
						error: kvError instanceof Error ? kvError.message : String(kvError),
					});
				}
			}

			return {
				summary: classification.summary,
				records: classification.records,
				investigation_queue: classification.investigation_queue,
				slack_delivered: slackDelivered,
			};
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			ctx.logger.error('DMARC classification failed', { error: errorMessage });
			throw error;
		}
	},
});

/**
 * Format classification results for Slack notification
 */
function formatSlackMessage(classification: any): string {
	const { summary, investigation_queue } = classification;

	let message = `📊 *DMARC Classification Report*\n\n`;
	message += `*Summary:*\n`;
	message += `• Total Records: ${summary.total_records}\n`;
	message += `• Status: ${summary.all_passing ? '✅ All Passing' : '⚠️ Issues Found'}\n`;
	message += `• Investigate: ${summary.investigate_count}\n`;
	message += `• Monitor: ${summary.monitor_count}\n\n`;

	if (investigation_queue.length > 0) {
		message += `*🔍 Investigation Queue (${investigation_queue.length} IPs):*\n`;
		for (const item of investigation_queue) {
			const emoji = item.priority === 'high' ? '🔴' : item.priority === 'medium' ? '🟡' : '🟢';
			message += `${emoji} ${item.ip} - Priority: ${item.priority}\n`;
			message += `   Triggers: ${item.trigger.join(', ')}\n`;
		}
	} else {
		message += `✅ No IPs require investigation\n`;
	}

	return message;
}

export default agent;
