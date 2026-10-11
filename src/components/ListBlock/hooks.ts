export function useListItems(items?: string[]) {
  const normalizedItems = items ?? [];
  return { hasItems: normalizedItems.length > 0, items: normalizedItems };
}
