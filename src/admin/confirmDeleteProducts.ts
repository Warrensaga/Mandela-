/** Asks the owner to confirm permanently deleting one or more products. */
export function confirmDeleteProducts(names: string[]): boolean {
  const list = names.length <= 8 ? names.map((n) => `• ${n}`).join('\n') : `${names.slice(0, 8).map((n) => `• ${n}`).join('\n')}\n…and ${names.length - 8} more`;
  const what = names.length === 1 ? 'this product' : `these ${names.length} products`;
  return window.confirm(
    `Permanently delete ${what}?\n\n${list}\n\nTheir photos, variations and stock history are removed and cannot be recovered. ` +
      `Past orders keep the product name, option and price they were sold with.\n\nTo hide a product but keep it, untick "Active" instead.`,
  );
}
