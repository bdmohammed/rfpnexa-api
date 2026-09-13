export function toNumber(value: string): number;
export function toNumber(value: string | undefined): number | null;
export function toNumber(value: string | null): number | null;
export function toNumber(value: string | null | undefined): number | null;
export function toNumber(value: string | null | undefined) {
  return value == null ? value : Number(value);
}
