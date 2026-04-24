import { Transaction } from './types';

export function parseBankMessage(text: string): Transaction | null {
	// Main amount regexes
	const usdRegex = /(?:\$|USD)\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i;
	const khrRegex = /(?:៛|KHR|RIELS)\s?(\d+(?:,\d+)?)|(\d+(?:,\d+)?)\s?(?:៛|KHR|RIELS)/i;
	const trxRegex = /(?:Trx\.?\s*ID|លេខប្រតិបត្តិការ)\s*:?\s*(\d+)/i;

	// FIX 1: Tip regex now handles optional words before the amount ("a $0.25 tip", "with a $0.25 tip")
	// Also handles "tip" appearing anywhere after the amount (not just immediately after)
	const tipUsdRegex = /\ba\s+(?:\$|USD)\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s+tip\b/i;
	const tipUsdSimpleRegex = /(?:\$|USD)\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s+tip\b/i;
	const tipKhrRegex = /(\d+(?:,\d+)?)\s?(?:៛|KHR|RIELS)\s+tip\b|(?:៛|KHR|RIELS)\s?(\d+(?:,\d+)?)\s+tip\b/i;

	// 1. Extract tip first (try "a $X.XX tip" pattern first, then simpler "$X.XX tip")
	let tip_amount = 0;
	let tip_currency: string | null = null;
	let mainSearchText = text;

	const tipUsdMatch = text.match(tipUsdRegex) || text.match(tipUsdSimpleRegex);
	const tipKhrMatch = text.match(tipKhrRegex);

	if (tipUsdMatch || tipKhrMatch) {
		// Prefer whichever appears first
		const tipUsdIndex = tipUsdMatch ? text.indexOf(tipUsdMatch[0]) : Infinity;
		const tipKhrIndex = tipKhrMatch ? text.indexOf(tipKhrMatch[0]) : Infinity;

		if (tipUsdMatch && tipUsdIndex <= tipKhrIndex) {
			tip_amount = parseFloat(tipUsdMatch[1].replace(/,/g, ''));
			tip_currency = 'USD';
			mainSearchText = text.replace(tipUsdMatch[0], '');
		} else if (tipKhrMatch) {
			const tipAmountStr = tipKhrMatch[1] || tipKhrMatch[2];
			tip_amount = parseFloat(tipAmountStr.replace(/,/g, ''));
			tip_currency = 'KHR';
			mainSearchText = text.replace(tipKhrMatch[0], '');
		}
	}

	// 2. Find the main amount in the remaining text (with tip portion removed)
	const usdMatch = mainSearchText.match(usdRegex);
	const khrMatch = mainSearchText.match(khrRegex);
	const trxMatch = text.match(trxRegex);

	if (usdMatch || khrMatch) {
		const usdIndex = usdMatch ? mainSearchText.indexOf(usdMatch[0]) : Infinity;
		const khrIndex = khrMatch ? mainSearchText.indexOf(khrMatch[0]) : Infinity;

		const isUSD = usdIndex < khrIndex;
		const match = isUSD ? usdMatch : khrMatch;

		const amountStr = isUSD ? match![1] : match![1] || match![2];
		const amount = parseFloat(amountStr.replace(/,/g, ''));
		const currency = isUSD ? 'USD' : 'KHR';

		return {
			amount,
			currency,
			tip_amount,
			tip_currency,
			trx_id: trxMatch ? trxMatch[1] : null,
		};
	}

	return null;
}
