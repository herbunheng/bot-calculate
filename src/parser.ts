export function parseBankMessage(text: string) {
  const usdRegex = /(?:\$|USD)\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i;
  const khrRegex = /(\d+(?:,\d+)?)\s?(?:៛|KHR|RIELS)/i;
  const trxRegex = /(?:Trx\.?\s?ID|លេខប្រតិបត្តិការ)\s?:?\s?(\d+)/i;

  const usdMatch = text.match(usdRegex);
  const khrMatch = text.match(khrRegex);
  const trxMatch = text.match(trxRegex);

  if (usdMatch || khrMatch) {
    return {
      amount: parseFloat((usdMatch ? usdMatch[1] : khrMatch![1]).replace(/,/g, "")),
      currency: usdMatch ? "USD" : "KHR",
      trx_id: trxMatch ? trxMatch[1] : null,
    };
  }
  return null;
}