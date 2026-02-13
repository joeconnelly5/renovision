import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as Canadian currency (CAD).
 * Returns "$12,345.00" style strings; null/undefined → "$0.00".
 */
export function formatCurrency(amount: number | null | undefined): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount ?? 0)
}

/**
 * Format an ISO date string into a human-readable date.
 * Returns "Jan 15, 2025" style strings; null/undefined → "—".
 */
export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}
