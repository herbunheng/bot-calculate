import { Env } from './types';
import { sendMessage } from './telegram';
import { parseBankMessage } from './parser';
import { handleCommand } from './commands';

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (request.method !== 'POST') return new Response('OK');

		try {
			const payload: any = await request.json();
			const msg = payload.message || payload.edited_message;
			if (!msg || !msg.text) return new Response('OK');

			const chatId = msg.chat.id.toString();
			const chatType = msg.chat.type;
			const userId = msg.from.id.toString();
			const username = msg.from.username || msg.from.first_name || 'User';
			const text = msg.text.trim();
			const command = text.split('@')[0].split(' ')[0]; // Get the command part

			// 1. Parse Bank Message First
			const bankData = parseBankMessage(text);
			if (bankData) {
				// Only track bank messages in groups (or as per logic)
				// If it's a group, we save it.
				if (chatType === 'group' || chatType === 'supergroup') {
					const trx_id = bankData.trx_id || `m_${Date.now()}_${userId}`;
					try {
						await env.DB.prepare(
							'INSERT INTO transactions (group_id, amount, currency, tip_amount, tip_currency, trx_id, raw_text) VALUES (?, ?, ?, ?, ?, ?, ?)',
						)
							.bind(chatId, bankData.amount, bankData.currency, bankData.tip_amount, bankData.tip_currency, trx_id, text)
							.run();

						let responseMsg = `✅ <b>កត់ត្រារួចរាល់៖</b>\n💰 <b>${bankData.amount} ${bankData.currency}</b>`;
						if (bankData.tip_amount > 0) {
							responseMsg += `\n🎁 Tips: <b>${bankData.tip_amount} ${bankData.tip_currency}</b>`;
						}

						await sendMessage(chatId, responseMsg, env);
					} catch (e: any) {
						// Handle duplicate Trx ID
						if (e.message.includes('UNIQUE constraint failed')) {
							console.log(`Duplicate transaction detected: ${trx_id}`);
						} else {
							console.error('DB Error:', e);
						}
					}
					return new Response('OK');
				}
			}

			// 2. Handle Commands if not a bank message or if command explicitly called
			await handleCommand(chatId, userId, username, command, chatType, env);
		} catch (err) {
			console.error('Global Error:', err);
		}

		return new Response('OK');
	},
};
