// Turns a SCREAMING_SNAKE_CASE enum into a human-readable label, e.g.
// 'SOCIAL_STUDIES' -> 'Social Studies'. Used to derive display options for
// Combobox/ExpertiseSelector directly from shared enums instead of
// maintaining separate, drift-prone string-array constants.
export function enumLabel(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

export function enumComboboxOptions<T extends Record<string, string>>(e: T): { value: string; label: string }[] {
  return Object.values(e).map((value) => ({ value, label: enumLabel(value) }));
}
