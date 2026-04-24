import { Transaction } from "./types";

export function parseBankMessage(text: string): Transaction | null {
  // Regex from requirements
  const usdRegex = /(?:\$|USD)\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i;
  const khrRegex = /(\d+(?:,\d+)?)\s?(?:៛|KHR|RIELS)/i;
  const trxRegex = /(?:Trx\.?\s?ID|លេខប្រតិបត្តិការ)\s?:?\s?(\d+)/i;
  
  // Tip Regex: Look for [amount] [currency] tip or [currency][amount] tip
  const tipRegex = /(?:(?:\$|USD)\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)|(\d+(?:,\d+)?)\s?(?:៛|KHR|RIELS))\s?tip/i;

  const usdMatch = text.match(usdRegex);
  const khrMatch = text.match(khrRegex);
  const trxMatch = text.match(trxRegex);
  const tipMatch = text.match(tipRegex);

  if (usdMatch || khrMatch) {
    const isUSD = !!usdMatch;
    const amountStr = isUSD ? usdMatch![1] : khrMatch![1];
    const amount = parseFloat(amountStr.replace(/,/g, ""));
    const currency = isUSD ? "USD" : "KHR";

    let tip_amount = 0;
    let tip_currency: string | null = null;

    if (tipMatch) {
      // tipMatch[1] is USD amount, tipMatch[2] is KHR amount
      const tipAmountStr = tipMatch[1] || tipMatch[2];
      tip_amount = parseFloat(tipAmountStr.replace(/,/g, ""));
      tip_currency = tipMatch[1] ? "USD" : "KHR";
    }

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