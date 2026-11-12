/**
 * Pure helpers for the admin variation editor: option edits, renames and
 * validation, kept out of the UI so they are easy to reason about.
 */

export interface EditableOption {
  /** Stable key for React and for tracking renames. */
  key: string;
  /** Name when loaded (null for new options). */
  originalName: string | null;
  name: string;
  values: EditableValue[];
}

export interface EditableValue {
  key: string;
  originalValue: string | null;
  value: string;
}

export interface OptionsPayload {
  options: { name: string; values: string[] }[];
  renames: { options: Record<string, string>; values: Record<string, Record<string, string>> };
}

let counter = 0;
export const newKey = () => `k${Date.now().toString(36)}${(counter++).toString(36)}`;

export function toEditable(options: { name: string; values: string[] }[]): EditableOption[] {
  return options.map((o) => ({
    key: newKey(),
    originalName: o.name,
    name: o.name,
    values: o.values.map((v) => ({ key: newKey(), originalValue: v, value: v })),
  }));
}

export function validateOptions(options: EditableOption[]): string[] {
  const errors: string[] = [];
  const names = new Set<string>();
  options.forEach((o, i) => {
    const name = o.name.trim();
    if (!name) errors.push(`Option ${i + 1} needs a name.`);
    else if (names.has(name.toLowerCase())) errors.push(`"${name}" is used twice.`);
    names.add(name.toLowerCase());
    const values = o.values.map((v) => v.value.trim());
    if (values.length === 0) errors.push(`"${name || `Option ${i + 1}`}" needs at least one value.`);
    if (values.some((v) => !v)) errors.push(`"${name || `Option ${i + 1}`}" has a blank value.`);
    const lower = values.map((v) => v.toLowerCase());
    if (new Set(lower).size !== lower.length) errors.push(`"${name || `Option ${i + 1}`}" has a duplicate value.`);
  });
  return errors;
}

/** Builds the admin_set_product_options payload, including renames of existing names/values. */
export function toPayload(options: EditableOption[]): OptionsPayload {
  const renames: OptionsPayload['renames'] = { options: {}, values: {} };
  for (const o of options) {
    const name = o.name.trim();
    if (o.originalName && o.originalName !== name) renames.options[o.originalName] = name;
    for (const v of o.values) {
      const value = v.value.trim();
      if (v.originalValue && v.originalValue !== value) {
        (renames.values[name] ??= {})[v.originalValue] = value;
      }
    }
  }
  return {
    options: options.map((o) => ({ name: o.name.trim(), values: o.values.map((v) => v.value.trim()) })),
    renames,
  };
}

export interface UsageEntry {
  option: string;
  value: string;
  variants: number;
  orderedLines: number;
}

/** Human warnings for values that are being removed but are in use. */
export function removalWarnings(original: { name: string; values: string[] }[], edited: EditableOption[], usage: UsageEntry[]): string[] {
  const warnings: string[] = [];
  for (const o of original) {
    const now = edited.find((e) => e.originalName === o.name);
    for (const value of o.values) {
      const kept = now?.values.some((v) => v.originalValue === value);
      if (kept) continue;
      const u = usage.find((x) => x.option === o.name && x.value === value);
      if (!u) continue;
      warnings.push(
        u.orderedLines > 0
          ? `Removing ${o.name} "${value}": ${u.variants} variant(s) have past orders and will be deactivated, not deleted.`
          : `Removing ${o.name} "${value}" deletes ${u.variants} variant(s).`,
      );
    }
  }
  const addedOptions = edited.filter((e) => !e.originalName);
  const removedOptions = original.filter((o) => !edited.some((e) => e.originalName === o.name));
  if (addedOptions.length || removedOptions.length) {
    warnings.push('Adding or removing a whole option changes every combination: existing variants are replaced. Use "Generate variants" afterwards and re-enter stock.');
  }
  return warnings;
}

export function combinationCount(options: EditableOption[]): number {
  return options.reduce((n, o) => n * Math.max(o.values.length, 1), options.length ? 1 : 0);
}
