import { Env } from "./types";
import { sendMessage } from "./telegram";
import { parseBankMessage } from "./parser";
import { handleCommand } from "./commands";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") return new Response("OK");

    try {
      const payload: any = await request.json();
      const msg = payload.message || payload.edited_message;
      if (!msg || !msg.text) return new Response("OK");

      const chatId = msg.chat.id.toString();
      const userId = msg.from.id.toString();
      const username = msg.from.username || msg.from.first_name || "User";
      const text = msg.text.trim();
      const command = text.split("@")[0]; // បំបែកយកតែ command (ករណីមាន @bot_name)

      // ១. ឆែកមើលក្រែងលោជាសារលុយចូល
      const bankData = parseBankMessage(text);
      if (bankData) {
        const trx_id = bankData.trx_id || `m_${Date.now()}_${userId}`;
        try {
          await env.DB.prepare(
            "INSERT INTO transactions (group_id, amount, currency, trx_id, raw_text) VALUES (?, ?, ?, ?, ?)"
          )
            .bind(chatId, bankData.amount, bankData.currency, trx_id, text)
            .run();

          await sendMessage(chatId, `✅ <b>កត់ត្រារួចរាល់៖</b>\n💰 <b>${bankData.amount} ${bankData.currency}</b>`, env);
        } catch (e) {
          // ប្រសិនបើ Trx ID ស្ទួន វានឹងមិនបញ្ចូលទេ
        }
        return new Response("OK");
      }

      // ២. បើមិនមែនសារលុយទេ ឆែកមើលក្រែងជា Command
      await handleCommand(chatId, userId, username, command, env);

    } catch (err) {
      console.error("Global Error:", err);
    }

    return new Response("OK");
  },
};