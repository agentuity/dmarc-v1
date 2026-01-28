/**
 * Type definitions for DMARC first-pass classification
 */

export type RecordStatus = 'ok' | 'monitor' | 'investigate';

export type Priority = 'low' | 'medium' | 'high';

/**
 * Fixed enum of reason codes - do not add new values
 */
export enum ReasonCode {
	// Authentication
	DMARC_PASS = 'DMARC_PASS',
	DMARC_FAIL = 'DMARC_FAIL',
	SPF_FAIL = 'SPF_FAIL',
	DKIM_FAIL = 'DKIM_FAIL',
	MISALIGNED = 'MISALIGNED',

	// Sender Context
	UNKNOWN_SENDER = 'UNKNOWN_SENDER',
	UNEXPECTED_DOMAIN = 'UNEXPECTED_DOMAIN',
	FIRST_SEEN_IP = 'FIRST_SEEN_IP',

	// Behavior
	LOW_VOLUME = 'LOW_VOLUME',
	VOLUME_SPIKE = 'VOLUME_SPIKE',
	MULTI_IP_PATTERN = 'MULTI_IP_PATTERN',
}

export interface ClassificationSummary {
	total_records: number;
	investigate_count: number;
	monitor_count: number;
	all_passing: boolean;
}

export interface ClassifiedRecord {
	source_ip: string;
	status: RecordStatus;
	reason_codes: ReasonCode[];
	confidence: number;
}

export interface InvestigationQueueItem {
	ip: string;
	trigger: ReasonCode[];
	priority: Priority;
}

export interface ClassificationOutput {
	summary: ClassificationSummary;
	records: ClassifiedRecord[];
	investigation_queue: InvestigationQueueItem[];
}

/**
 * Input DMARC record structure (parsed from XML)
 */
export interface DmarcRecord {
	source_ip: string;
	count: number;
	policy_evaluated: {
		disposition: string;
		dkim: string;
		spf: string;
	};
	identifiers: {
		header_from: string;
		envelope_from: string;
	};
	auth_results: {
		dkim?: Array<{
			domain: string;
			result: string;
		}>;
		spf?: Array<{
			domain: string;
			result: string;
		}>;
	};
}

export interface ClassificationInput {
	records: DmarcRecord[];
}
