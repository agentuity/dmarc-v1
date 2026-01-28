/**
 * Schema definitions for DMARC processor agent
 */

import { s } from '@agentuity/schema';

// DMARC record schema (input for classification)
export const DmarcRecordSchema = s.object({
	source_ip: s.string(),
	count: s.number(),
	policy_evaluated: s.object({
		disposition: s.string(),
		dkim: s.string(),
		spf: s.string(),
	}),
	identifiers: s.object({
		header_from: s.string(),
		envelope_from: s.string(),
	}),
	auth_results: s.object({
		dkim: s.optional(
			s.array(
				s.object({
					domain: s.string(),
					result: s.string(),
				})
			)
		),
		spf: s.optional(
			s.array(
				s.object({
					domain: s.string(),
					result: s.string(),
				})
			)
		),
	}),
});

// Input schema - supports two modes:
// 1. Pre-parsed records (direct classification)
// 2. Raw file content (zip or XML - will be parsed then classified)
export const DmarcProcessorInputSchema = s.union(
	s.object({
		records: s.array(DmarcRecordSchema),
	}),
	s.object({
		file: s.object({
			content: s.string(), // base64-encoded zip or XML
			filename: s.optional(s.string()),
		}),
	})
);

// Classification summary
export const ClassificationSummarySchema = s.object({
	total_records: s.number(),
	investigate_count: s.number(),
	monitor_count: s.number(),
	all_passing: s.boolean(),
});

// Classified record
export const ClassifiedRecordSchema = s.object({
	source_ip: s.string(),
	status: s.enum(['ok', 'monitor', 'investigate']),
	reason_codes: s.array(s.string()),
	confidence: s.number(),
});

// Investigation queue item
export const InvestigationQueueItemSchema = s.object({
	ip: s.string(),
	trigger: s.array(s.string()),
	priority: s.enum(['low', 'medium', 'high']),
});

// Output schema
export const DmarcProcessorOutputSchema = s.object({
	summary: ClassificationSummarySchema,
	records: s.array(ClassifiedRecordSchema),
	investigation_queue: s.array(InvestigationQueueItemSchema),
	slack_delivered: s.boolean(),
});

// Type exports for TypeScript
export type DmarcProcessorInput = s.infer<typeof DmarcProcessorInputSchema>;
export type DmarcProcessorOutput = s.infer<typeof DmarcProcessorOutputSchema>;
