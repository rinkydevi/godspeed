declare module 'date-fns' {
  export function formatDistanceToNow(date: Date | number, options?: { addSuffix?: boolean; locale?: object }): string
  export function format(date: Date | number, formatStr: string, options?: { locale?: object }): string
  export function parseISO(dateString: string): Date
  export function isValid(date: unknown): boolean
  export function addDays(date: Date | number, amount: number): Date
  export function subDays(date: Date | number, amount: number): Date
  export function differenceInDays(dateLeft: Date | number, dateRight: Date | number): number
}
