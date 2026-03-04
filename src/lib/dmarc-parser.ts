/**
 * DMARC XML/ZIP Parser
 * Extracts and parses DMARC records from zip files containing XML reports
 */

import JSZip from 'jszip';
import { gunzipSync } from 'node:zlib';
import { XMLParser } from 'fast-xml-parser';
import type { DmarcRecord } from './classification-types';

export interface ParsedDmarcReport {
	records: DmarcRecord[];
	metadata: {
		reportId?: string;
		orgName?: string;
		email?: string;
		dateRange?: {
			begin: number;
			end: number;
		};
	};
}

/**
 * Parse DMARC aggregate report from base64-encoded zip file
 */
export async function parseDmarcZip(base64Content: string): Promise<ParsedDmarcReport> {
	// Decode base64 to binary
	const binaryContent = Buffer.from(base64Content, 'base64');

	// Unzip the content
	const zip = await JSZip.loadAsync(binaryContent);

	// Find XML files in the zip
	const xmlFiles = Object.keys(zip.files).filter((filename) => {
		const file = zip.files[filename];
		return file && filename.endsWith('.xml') && !file.dir;
	});

	if (xmlFiles.length === 0) {
		throw new Error('No XML files found in zip archive');
	}

	// Parse the first XML file (DMARC reports typically contain one XML)
	const firstXmlFilename = xmlFiles[0];
	if (!firstXmlFilename) {
		throw new Error('No XML files found in zip archive');
	}

	const xmlFile = zip.files[firstXmlFilename];
	if (!xmlFile) {
		throw new Error('XML file not found in zip archive');
	}

	const xmlContent = await xmlFile.async('text');

	return parseDmarcXml(xmlContent);
}

/**
 * Parse DMARC aggregate report from XML string
 */
export function parseDmarcXml(xmlContent: string): ParsedDmarcReport {
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: '@_',
	});

	const parsed = parser.parse(xmlContent);

	// Navigate to feedback element
	const feedback = parsed.feedback || parsed;

	if (!feedback) {
		throw new Error('Invalid DMARC XML: missing feedback element');
	}

	// Extract metadata
	const reportMetadata = feedback.report_metadata || {};
	const metadata = {
		reportId: reportMetadata.report_id,
		orgName: reportMetadata.org_name,
		email: reportMetadata.email,
		dateRange: reportMetadata.date_range
			? {
					begin: parseInt(reportMetadata.date_range.begin, 10),
					end: parseInt(reportMetadata.date_range.end, 10),
			  }
			: undefined,
	};

	// Extract policy published
	const policyPublished = feedback.policy_published || {};

	// Extract records
	let recordsArray = feedback.record;

	// Handle single record vs array of records
	if (!recordsArray) {
		return { records: [], metadata };
	}

	if (!Array.isArray(recordsArray)) {
		recordsArray = [recordsArray];
	}

	// Transform to DmarcRecord format
	const records: DmarcRecord[] = recordsArray.map((record: any) => {
		const row = record.row || {};
		const identifiers = record.identifiers || {};
		const authResults = record.auth_results || {};

		// Parse policy_evaluated
		const policyEvaluated = row.policy_evaluated || {};

		// Parse auth results
		const dkimResults = authResults.dkim
			? Array.isArray(authResults.dkim)
				? authResults.dkim
				: [authResults.dkim]
			: [];

		const spfResults = authResults.spf
			? Array.isArray(authResults.spf)
				? authResults.spf
				: [authResults.spf]
			: [];

		return {
			source_ip: row.source_ip || '',
			count: parseInt(row.count, 10) || 0,
			policy_evaluated: {
				disposition: policyEvaluated.disposition || 'none',
				dkim: policyEvaluated.dkim || 'fail',
				spf: policyEvaluated.spf || 'fail',
			},
			identifiers: {
				header_from: identifiers.header_from || '',
				envelope_from: identifiers.envelope_from || identifiers.header_from || '',
			},
			auth_results: {
				dkim: dkimResults.map((dkim: any) => ({
					domain: dkim.domain || '',
					result: dkim.result || 'fail',
				})),
				spf: spfResults.map((spf: any) => ({
					domain: spf.domain || '',
					result: spf.result || 'fail',
				})),
			},
		};
	});

	return {
		records,
		metadata,
	};
}

/**
 * Parse DMARC report from various input formats
 */
export async function parseDmarcInput(input: {
	base64Content?: string;
	xmlContent?: string;
}): Promise<ParsedDmarcReport> {
	if (input.base64Content) {
		const binaryContent = Buffer.from(input.base64Content, 'base64');

		// Try to parse as zip first
		try {
			return await parseDmarcZip(input.base64Content);
		} catch (zipError) {
			// Try gzip decompression (common for .xml.gz DMARC reports)
			try {
				const decompressed = gunzipSync(binaryContent);
				return parseDmarcXml(decompressed.toString('utf-8'));
			} catch (gzipError) {
				// Fall back to raw XML (might be base64-encoded XML)
				try {
					return parseDmarcXml(binaryContent.toString('utf-8'));
				} catch (xmlError) {
					throw new Error(
						`Failed to parse DMARC content: ${zipError instanceof Error ? zipError.message : String(zipError)}`
					);
				}
			}
		}
	}

	if (input.xmlContent) {
		return parseDmarcXml(input.xmlContent);
	}

	throw new Error('No content provided for parsing');
}
