import { Transaction } from "./types";

export function parseBankMessage(text: string): Transaction | null {
  // Enhanced Regex to handle symbols at front or back
  const usdRegex = /(?:\$|USD)\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i;
  const khrRegex = /(?:៛|KHR|RIELS)\s?(\d+(?:,\d+)?)|(\d+(?:,\d+)?)\s?(?:៛|KHR|RIELS)/i;
  const trxRegex = /(?:Trx\.?\s?ID|លេខប្រតិបត្តិការ)\s?:?\s?(\d+)/i;
  
  // Tip Regex: Look for [amount] [currency] tip or [currency][amount] tip
  const tipRegex = /(?:(?:\$|USD)\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)|(\d+(?:,\d+)?)\s?(?:៛|KHR|RIELS))\s?tip/i;

  // 1. First, look for a tip and extract it
  const tipMatch = text.match(tipRegex);
  let tip_amount = 0;
  let tip_currency: string | null = null;
  let mainSearchText = text;

  if (tipMatch) {
    const tipAmountStr = tipMatch[1] || tipMatch[2];
    tip_amount = parseFloat(tipAmountStr.replace(/,/g, ""));
    tip_currency = tipMatch[1] ? "USD" : "KHR";
    // Remove the tip part from text so we don't match it as the main amount
    mainSearchText = text.replace(tipMatch[0], "");
  }

  // 2. Now find the main amount in the remaining text
  const usdMatch = mainSearchText.match(usdRegex);
  const khrMatch = mainSearchText.match(khrRegex);
  const trxMatch = text.match(trxRegex);

  if (usdMatch || khrMatch) {
    // Decide which one is the main amount (the one that appears first)
    const usdIndex = usdMatch ? mainSearchText.indexOf(usdMatch[0]) : Infinity;
    const khrIndex = khrMatch ? mainSearchText.indexOf(khrMatch[0]) : Infinity;

    const isUSD = usdIndex < khrIndex;
    const match = isUSD ? usdMatch : khrMatch;
    
    // khrMatch groups: match[1] if front-symbol, match[2] if back-symbol
    const amountStr = isUSD ? match![1] : (match![1] || match![2]);
    const amount = parseFloat(amountStr.replace(/,/g, ""));
    const currency = isUSD ? "USD" : "KHR";

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