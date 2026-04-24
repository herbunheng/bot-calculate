export interface Env {
  bot_db: D1Database;
  TELEGRAM_BOT_TOKEN: string;
}

export interface Transaction {
  amount: number;
  currency: string;
  tip_amount: number;
  tip_currency: string | null;
  trx_id: string | null;
}