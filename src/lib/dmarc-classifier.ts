/**
 * DMARC First-Pass Classification Module
 * Uses LLM to classify DMARC records according to strict rules
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
	ClassificationInput,
	ClassificationOutput,
	DmarcRecord,
} from './classification-types';
import { CLASSIFICATION_SYSTEM_PROMPT, createUserPrompt } from './classification-prompts';

export interface ClassifierConfig {
	apiKey?: string;
	model?: string;
	maxTokens?: number;
	temperature?: number;
}

const DEFAULT_CONFIG = {
	model: 'claude-3-5-sonnet-20241022',
	maxTokens: 4096,
	temperature: 0,
};

export class DmarcClassifier {
	private client: Anthropic;
	private config: typeof DEFAULT_CONFIG & { apiKey?: string };

	constructor(config: ClassifierConfig = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };

		// Let Anthropic SDK use environment variable if apiKey not provided
		// Agentuity will automatically supply ANTHROPIC_API_KEY
		this.client = new Anthropic(
			this.config.apiKey ? { apiKey: this.config.apiKey } : {}
		);
	}

	/**
	 * Classify DMARC records using LLM
	 * Returns strict JSON output according to classification schema
	 */
	async classify(input: ClassificationInput): Promise<ClassificationOutput> {
		// Validate input
		if (!input.records || input.records.length === 0) {
			return this.emptyClassification();
		}

		// Convert records to JSON string
		const recordsJson = JSON.stringify(input.records, null, 2);

		try {
			// Call Claude API
			const message = await this.client.messages.create({
				model: this.config.model,
				max_tokens: this.config.maxTokens,
				temperature: this.config.temperature,
				system: CLASSIFICATION_SYSTEM_PROMPT,
				messages: [
					{
						role: 'user',
						content: createUserPrompt(recordsJson),
					},
				],
			});

			// Extract text content
			const textContent = message.content.find((block) => block.type === 'text');
			if (!textContent || textContent.type !== 'text') {
				throw new Error('No text content in LLM response');
			}

			// Parse JSON response
			const rawText = textContent.text;
			const jsonMatch = rawText.match(/\{[\s\S]*\}/);
			if (!jsonMatch) {
				throw new Error('No JSON found in LLM response');
			}

			const classification: ClassificationOutput = JSON.parse(jsonMatch[0]);

			// Validate output structure
			this.validateOutput(classification);

			return classification;
		} catch (error) {
			if (error instanceof Error) {
				throw new Error(`Classification failed: ${error.message}`);
			}
			throw error;
		}
	}

	/**
	 * Validate classification output matches expected schema
	 */
	private validateOutput(output: any): asserts output is ClassificationOutput {
		if (!output || typeof output !== 'object') {
			throw new Error('Output must be an object');
		}

		// Validate summary
		if (!output.summary || typeof output.summary !== 'object') {
			throw new Error('Output must contain summary object');
		}

		const requiredSummaryFields = [
			'total_records',
			'investigate_count',
			'monitor_count',
			'all_passing',
		];
		for (const field of requiredSummaryFields) {
			if (!(field in output.summary)) {
				throw new Error(`Summary missing required field: ${field}`);
			}
		}

		// Validate records array
		if (!Array.isArray(output.records)) {
			throw new Error('Output must contain records array');
		}

		// Validate investigation_queue array
		if (!Array.isArray(output.investigation_queue)) {
			throw new Error('Output must contain investigation_queue array');
		}

		// Validate each record has required fields
		for (const record of output.records) {
			if (!record.source_ip || !record.status || !Array.isArray(record.reason_codes)) {
				throw new Error('Invalid record structure');
			}
			if (typeof record.confidence !== 'number' || record.confidence < 0 || record.confidence > 1) {
				throw new Error('Confidence must be a number between 0 and 1');
			}
		}

		// Validate investigation queue items
		for (const item of output.investigation_queue) {
			if (!item.ip || !Array.isArray(item.trigger) || !item.priority) {
				throw new Error('Invalid investigation queue item structure');
			}
		}
	}

	/**
	 * Return empty classification for no records
	 */
	private emptyClassification(): ClassificationOutput {
		return {
			summary: {
				total_records: 0,
				investigate_count: 0,
				monitor_count: 0,
				all_passing: true,
			},
			records: [],
			investigation_queue: [],
		};
	}
}

/**
 * Convenience function to classify DMARC records
 */
export async function classifyDmarcRecords(
	records: DmarcRecord[],
	config?: ClassifierConfig
): Promise<ClassificationOutput> {
	const classifier = new DmarcClassifier(config);
	return classifier.classify({ records });
}
