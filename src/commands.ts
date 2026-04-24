import { Env } from "./types";
import { sendMessage } from "./telegram";

export async function handleCommand(chatId: string, userId: string, username: string, command: string, env: Env) {
  
  // --- Register Command ---
  if (command === "/register" || command === "📝 ចុះឈ្មោះនៅទីនេះ") {
    await env.DB.prepare("INSERT OR IGNORE INTO users (user_id, username) VALUES (?, ?)")
      .bind(userId, username)
      .run();
    return sendMessage(chatId, "✅ <b>ចុះឈ្មោះជោគជ័យ!</b>", env, { reply_markup: { remove_keyboard: true } });
  }

  // --- Report Commands (/today, /week, /month) ---
  if (["/today", "/week", "/month"].includes(command)) {
    let dateCondition = "";
    let periodName = "";

    if (command === "/today") {
      dateCondition = "date(created_at, '+7 hours') = date('now', '+7 hours')";
      periodName = "ថ្ងៃនេះ";
    } else if (command === "/week") {
      dateCondition = "date(created_at, '+7 hours') >= date('now', '+7 hours', '-7 days')";
      periodName = "7 ថ្ងៃចុងក្រោយ";
    } else if (command === "/month") {
      dateCondition = "date(created_at, '+7 hours') >= date('now', '+7 hours', 'start of month')";
      periodName = "ខែនេះ";
    }

    const reportData = await env.DB.prepare(`
      SELECT currency, SUM(amount) as total 
      FROM transactions 
      WHERE group_id = ? AND ${dateCondition}
      GROUP BY currency
    `).bind(chatId).all();

    let reportMsg = `📊 <b>របាយការណ៍ចំណូល (${periodName})៖</b>\n\n`;
    if (reportData.results && reportData.results.length > 0) {
      reportData.results.forEach((row: any) => {
        const total = row.total.toLocaleString(undefined, { minimumFractionDigits: row.currency === "USD" ? 2 : 0 });
        reportMsg += `• <b>${total} ${row.currency}</b>\n`;
      });
    } else {
      reportMsg += "<i>មិនទាន់មានទិន្នន័យនៅឡើយទេ។</i>";
    }
    return sendMessage(chatId, reportMsg, env);
  }
}