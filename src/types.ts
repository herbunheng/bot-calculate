export interface Env {
	DB: D1Database;
	KV: KVNamespace;
	TELEGRAM_BOT_TOKEN: string;
}

export interface Transaction {
	amount: number;
	currency: string;
	tip_amount: number;
	tip_currency: string | null;
	trx_id: string | null;
}
