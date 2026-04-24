import { Env } from './types';
import { sendMessage } from './telegram';
import { parseBankMessage } from './parser';
import { handleCommand } from './commands';
import { handleAdminPage, handleAdminStats } from './admin';

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (request.method === 'GET') {
			const url = new URL(request.url);

			// Serve the Admin Dashboard UI
			if (url.pathname === '/admin') {
				return await handleAdminPage();
			}

			// JSON API for the Dashboard
			if (url.pathname === '/api/stats') {
				return await handleAdminStats(env);
			}

			return new Response('Bot is running! Visit /admin for dashboard.', { headers: { 'Content-Type': 'text/plain' } });
		}

		if (request.method !== 'POST') return new Response('OK');

		try {
			const payload: any = await request.json();

			console.log('[INDEX] Raw payload keys:', Object.keys(payload));

			const msg = payload.message || payload.edited_message;

			if (!msg) {
				console.log('[INDEX] No message found in payload');
				return new Response('OK');
			}

			console.log(
				'[INDEX] Message received:',
				JSON.stringify({
					chat_id: msg.chat?.id,
					chat_type: msg.chat?.type,
					from_id: msg.from?.id,
					text: msg.text?.substring(0, 100),
					has_text: !!msg.text,
				}),
			);

			if (!msg.text) {
				console.log('[INDEX] Message has no text, skipping');
				return new Response('OK');
			}

			const chatId = msg.chat.id.toString();
			const chatType = msg.chat.type; // 'private', 'group', 'supergroup'
			const userId = msg.from.id.toString();
			const username = msg.from.username || msg.from.first_name || 'User';
			const text = msg.text.trim();
			const command = text.split('@')[0].split(' ')[0];

			console.log('[INDEX] chatType:', chatType, 'command:', command);

			// --- Save to History (D1 & KV Cache) ---
			try {
				// 1. Save to D1 (Permanent Storage)
				await env.DB.prepare('INSERT INTO messages (group_id, user_id, username, text, message_id) VALUES (?, ?, ?, ?, ?)')
					.bind(chatId, userId, username, text, msg.message_id)
					.run();

				// 2. Save to KV (Short-term cache for performance)
				const kvKey = `history:${chatId}`;
				const historyStr = await env.KV.get(kvKey);
				let history = historyStr ? JSON.parse(historyStr) : [];
				history.push({ username, text, time: new Date().toISOString() });
				if (history.length > 20) history = history.slice(-20); // Keep last 20 messages
				await env.KV.put(kvKey, JSON.stringify(history), { expirationTtl: 86400 * 7 }); // Keep for 7 days
			} catch (historyErr) {
				console.error('[INDEX] Failed to save history:', historyErr);
			}

			// 1. Try to parse as a bank message first
			const bankData = parseBankMessage(text);

			if (bankData) {
				console.log('[INDEX] Bank data found:', JSON.stringify(bankData));

				if (chatType === 'group' || chatType === 'supergroup') {
					const trx_id = bankData.trx_id || `m_${Date.now()}_${userId}`;
					console.log('[INDEX] Saving to DB with trx_id:', trx_id);

					try {
						await env.DB.prepare(
							'INSERT INTO transactions (group_id, amount, currency, tip_amount, tip_currency, trx_id, raw_text) VALUES (?, ?, ?, ?, ?, ?, ?)',
						)
							.bind(chatId, bankData.amount, bankData.currency, bankData.tip_amount, bankData.tip_currency, trx_id, text)
							.run();

						console.log('[INDEX] DB insert success');
					} catch (e: any) {
						if (e.message?.includes('UNIQUE constraint failed')) {
							console.log('[INDEX] Duplicate transaction:', trx_id);
						} else {
							console.error('[INDEX] DB Error:', e.message, e);
						}
					}
				} else {
					console.log('[INDEX] Bank message in non-group chat, skipping DB save. chatType:', chatType);
				}

				return new Response('OK');
			}

			// 2. Handle commands
			console.log('[INDEX] Not a bank message, handling as command:', command);
			await handleCommand(chatId, userId, username, command, chatType, env);
		} catch (err: any) {
			console.error('[INDEX] Global Error:', err.message, err);
		}

		return new Response('OK');
	},
};
