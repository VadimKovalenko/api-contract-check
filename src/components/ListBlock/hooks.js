export function useListItems(items) {
  const normalizedItems = items || [];
  return { hasItems: normalizedItems.length > 0, items: normalizedItems };
}
