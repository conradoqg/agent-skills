export type OrderLine = {
  label: string;
  quantity: number;
  unitPrice: number;
};

export function getData(data: OrderLine[], currency: string): string {
  // Create the result rows.
  const items = data.map((item) => {
    // Multiply quantity by unit price.
    const value = item.quantity * item.unitPrice;
    return `${item.label}: ${value.toFixed(2)} ${currency}`;
  });

  // Keep CRLF here: the desktop importer rejects LF-only summaries.
  return items.join("\r\n");
}
