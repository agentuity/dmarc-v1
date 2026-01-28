/**
 * Slack integration for DMARC notifications
 */

import { WebClient } from '@slack/web-api';

/**
 * Send a message to Slack using SDK's built-in retry logic
 *
 * @param message Message text to send
 * @param logger Optional logger for debugging
 * @returns Promise that resolves when message is sent
 */
export async function sendToSlack(
	message: string,
	logger?: { info: (msg: string) => void; warn: (msg: string) => void; error: (msg: string, err?: any) => void }
): Promise<void> {
	const token = process.env.SLACK_BOT_TOKEN;
	const channelId = process.env.DMARC_CHANNEL_ID;

	if (!token) {
		throw new Error('SLACK_BOT_TOKEN environment variable not set');
	}

	if (!channelId) {
		throw new Error('DMARC_CHANNEL_ID environment variable not set');
	}

	// Use Slack SDK's built-in retry configuration
	const client = new WebClient(token, {
		retryConfig: {
			retries: 3,
			factor: 2, // exponential backoff factor
		},
	});

	try {
		await client.chat.postMessage({
			channel: channelId,
			text: message,
		});

		logger?.info(`Slack message sent to ${channelId}`);
	} catch (error: any) {
		logger?.error(`Failed to send Slack message after retries: ${error.message}`, error);
		throw error;
	}
}
