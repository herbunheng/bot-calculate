import { Env } from './types';
import { sendMessage } from './telegram';

export async function handleCommand(chatId: string, userId: string, username: string, command: string, chatType: string, env: Env) {
	// --- Help / Start Command (Universal) ---
	if (command === '/help' || command === '/start') {
		let msg =
			`👋 <b>សួស្តី ${username}!</b>\n\n` +
			`នេះគឺជាប៊ូតសម្រាប់កត់ត្រាចំណូលស្វ័យប្រវត្តិ។\n\n` +
			`<b>បញ្ជីពាក្យបញ្ជា (Command List):</b>\n` +
			`• /register - ចុះឈ្មោះគណនីរបស់អ្នក\n` +
			`• /today - របាយការណ៍ចំណូលថ្ងៃនេះ\n` +
			`• /week - របាយការណ៍ចំណូល ៧ ថ្ងៃចុងក្រោយ\n` +
			`• /month - របាយការណ៍ចំណូលខែនេះ\n` +
			`• /help - បង្ហាញជំនួយ\n\n`;

		if (chatType === 'private') {
			msg +=
				`<b>ការណែនាំ៖</b>\n` +
				`១. ចុច /register ដើម្បីចុះឈ្មោះ\n` +
				`២. បន្ថែមប៊ូតនេះទៅក្នុង <b>Group</b> របស់អ្នក\n` +
				`៣. កំណត់ប៊ូតជា <b>Admin</b> និងបិទ <b>Privacy Mode</b> ក្នុង @BotFather ដើម្បីឱ្យវាអាចអានសារបាន។`;
		} else {
			msg += `💡 <b>Tip:</b> ប៊ូតនឹងកត់ត្រាសារបញ្ជាក់ការផ្ទេរប្រាក់ដោយស្វ័យប្រវត្តិ រួមទាំងប្រាក់ឧបត្ថម្ភ (Tips) ផងដែរ។`;
		}

		return sendMessage(chatId, msg, env);
	}

	// --- Register Command ---
	if (command === '/register' || command === '📝 ចុះឈ្មោះនៅទីនេះ') {
		await env.DB.prepare('INSERT OR IGNORE INTO users (user_id, username) VALUES (?, ?)').bind(userId, username).run();
		return sendMessage(chatId, '✅ <b>ចុះឈ្មោះជោគជ័យ!</b>', env, { reply_markup: { remove_keyboard: true } });
	}

	// --- Report Commands (/today, /week, /month) ---
	if (['/today', '/week', '/month'].includes(command)) {
		if (chatType === 'private') {
			return sendMessage(chatId, '⚠️ កម្មវិធីរបាយការណ៍អាចប្រើបានតែក្នុង Group ប៉ុណ្ណោះ។', env);
		}

		let dateCondition = '';
		let periodName = '';

		if (command === '/today') {
			dateCondition = "date(created_at, '+7 hours') = date('now', '+7 hours')";
			periodName = 'ថ្ងៃនេះ';
		} else if (command === '/week') {
			dateCondition = "date(created_at, '+7 hours') >= date('now', '+7 hours', '-7 days')";
			periodName = '7 ថ្ងៃចុងក្រោយ';
		} else if (command === '/month') {
			dateCondition = "date(created_at, '+7 hours') >= date('now', '+7 hours', 'start of month')";
			periodName = 'ខែនេះ';
		}

		const amountResults = await env.DB.prepare(
			`SELECT currency, SUM(amount) as total 
       FROM transactions 
       WHERE group_id = ? AND ${dateCondition}
       GROUP BY currency`,
		)
			.bind(chatId)
			.all();

		const tipResults = await env.DB.prepare(
			`SELECT tip_currency as currency, SUM(tip_amount) as total 
       FROM transactions 
       WHERE group_id = ? AND ${dateCondition} AND tip_amount > 0
       GROUP BY tip_currency`,
		)
			.bind(chatId)
			.all();

		let reportMsg = `📊 <b>របាយការណ៍ចំណូល (${periodName})៖</b>\n\n`;

		const summary: Record<string, { amount: number; tip: number }> = {};

		amountResults.results?.forEach((row: any) => {
			if (!summary[row.currency]) summary[row.currency] = { amount: 0, tip: 0 };
			summary[row.currency].amount = row.total;
		});

		tipResults.results?.forEach((row: any) => {
			if (!summary[row.currency]) summary[row.currency] = { amount: 0, tip: 0 };
			summary[row.currency].tip = row.total;
		});

		const currencies = Object.keys(summary);
		if (currencies.length > 0) {
			currencies.forEach((curr) => {
				const data = summary[curr];
				const totalAmount = data.amount.toLocaleString(undefined, { minimumFractionDigits: curr === 'USD' ? 2 : 0 });
				const totalTip = data.tip.toLocaleString(undefined, { minimumFractionDigits: curr === 'USD' ? 2 : 0 });

				reportMsg += `💰 <b>${curr}:</b>\n`;
				reportMsg += `• Amount: <b>${totalAmount} ${curr}</b>\n`;
				if (data.tip > 0) {
					reportMsg += `• Tips: <b>${totalTip} ${curr}</b>\n`;
				}
				reportMsg += `\n`;
			});
		} else {
			reportMsg += '<i>មិនទាន់មានទិន្នន័យនៅឡើយទេ។</i>';
		}

		return sendMessage(chatId, reportMsg, env);
	}
}
