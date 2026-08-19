import { Sale } from '../../models';

export type TrendMetric = 'amount' | 'salesCount';

export interface TrendPoint {
  key: string;
  label: string;
  amount: number;
  salesCount: number;
  profit: number;
  quantity: number;
}

export interface SalesTrendAnalysis {
  daily: TrendPoint[];
  weekly: TrendPoint[];
  weekday: TrendPoint[];
  hourly: TrendPoint[];
  bestDay: TrendPoint | null;
  slowestDay: TrendPoint | null;
  bestWeek: TrendPoint | null;
  bestWeekday: TrendPoint | null;
  bestHour: TrendPoint | null;
  emptyDays: number;
  averageDailyAmount: number;
  averageDailySales: number;
  totalAmount: number;
  totalSalesCount: number;
  totalProfit: number;
  totalQuantity: number;
}

export const WEEKDAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayYmd(): string {
  return formatYmd(new Date());
}

export function addDaysYmd(ymd: string, days: number): string {
  const date = parseYmd(ymd);
  date.setDate(date.getDate() + days);
  return formatYmd(date);
}

export function metricValue(point: TrendPoint, metric: TrendMetric): number {
  return metric === 'amount' ? point.amount : point.salesCount;
}

export function analyzeSales(sales: Sale[], fromDate: string, toDate: string): SalesTrendAnalysis {
  const dailyMap = new Map<string, TrendPoint>();
  const weeklyMap = new Map<string, TrendPoint>();
  const weekdayTotals = WEEKDAY_LABELS.map((label, index) => emptyPoint(String(index), label));
  const hourlyTotals = Array.from({ length: 24 }, (_, hour) =>
    emptyPoint(String(hour), `${String(hour).padStart(2, '0')}:00`)
  );

  for (const sale of sales) {
    const created = new Date(sale.createdAt);
    if (Number.isNaN(created.getTime())) continue;

    const dayKey = formatYmd(created);
    const weekStart = startOfWeek(created);
    const weekKey = formatYmd(weekStart);
    const quantity = (sale.items ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0);

    addToPoint(dailyMap, dayKey, formatDayLabel(created), sale, quantity);
    addToPoint(weeklyMap, weekKey, formatWeekLabel(weekStart), sale, quantity);
    addToTotals(weekdayTotals[mondayIndex(created.getDay())], sale, quantity);
    addToTotals(hourlyTotals[created.getHours()], sale, quantity);
  }

  const daily = eachDay(fromDate, toDate).map((key) => {
    const date = parseYmd(key);
    return dailyMap.get(key) ?? emptyPoint(key, formatDayLabel(date));
  });
  const weekly = eachWeek(fromDate, toDate).map((key) => {
    const weekStart = parseYmd(key);
    return weeklyMap.get(key) ?? emptyPoint(key, formatWeekLabel(weekStart));
  });

  const daysWithSales = daily.filter((point) => point.salesCount > 0);
  const bestDay = maxPoint(daysWithSales);
  const slowestDay = minPoint(daysWithSales);
  const bestWeek = maxPoint(weekly.filter((point) => point.salesCount > 0));
  const bestWeekday = maxPoint(weekdayTotals.filter((point) => point.salesCount > 0));
  const bestHour = maxPoint(hourlyTotals.filter((point) => point.salesCount > 0));
  const totalAmount = daysWithSales.reduce((sum, point) => sum + point.amount, 0);
  const totalSalesCount = daysWithSales.reduce((sum, point) => sum + point.salesCount, 0);
  const totalProfit = daysWithSales.reduce((sum, point) => sum + point.profit, 0);
  const totalQuantity = daysWithSales.reduce((sum, point) => sum + point.quantity, 0);
  const dayCount = Math.max(daily.length, 1);

  return {
    daily,
    weekly,
    weekday: weekdayTotals,
    hourly: hourlyTotals,
    bestDay,
    slowestDay,
    bestWeek,
    bestWeekday,
    bestHour,
    emptyDays: daily.filter((point) => point.salesCount === 0).length,
    averageDailyAmount: totalAmount / dayCount,
    averageDailySales: totalSalesCount / dayCount,
    totalAmount,
    totalSalesCount,
    totalProfit,
    totalQuantity
  };
}

export function rankedPoints(points: TrendPoint[], metric: TrendMetric, limit = 10): TrendPoint[] {
  return [...points]
    .filter((point) => point.salesCount > 0)
    .sort((a, b) => metricValue(b, metric) - metricValue(a, metric))
    .slice(0, limit);
}

function emptyPoint(key: string, label: string): TrendPoint {
  return { key, label, amount: 0, salesCount: 0, profit: 0, quantity: 0 };
}

function addToPoint(
  map: Map<string, TrendPoint>,
  key: string,
  label: string,
  sale: Sale,
  quantity: number
): void {
  const current = map.get(key) ?? emptyPoint(key, label);
  addToTotals(current, sale, quantity);
  map.set(key, current);
}

function addToTotals(point: TrendPoint, sale: Sale, quantity: number): void {
  point.amount += sale.total ?? 0;
  point.salesCount += 1;
  point.profit += sale.profit ?? 0;
  point.quantity += quantity;
}

function parseYmd(ymd: string): Date {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - mondayIndex(start.getDay()));
  return start;
}

function mondayIndex(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

function eachDay(fromDate: string, toDate: string): string[] {
  const days: string[] = [];
  const current = parseYmd(fromDate);
  const end = parseYmd(toDate);
  while (current <= end) {
    days.push(formatYmd(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function eachWeek(fromDate: string, toDate: string): string[] {
  const weeks: string[] = [];
  const current = startOfWeek(parseYmd(fromDate));
  const end = parseYmd(toDate);
  while (current <= end) {
    weeks.push(formatYmd(current));
    current.setDate(current.getDate() + 7);
  }
  return weeks;
}

function formatDayLabel(date: Date): string {
  const weekday = WEEKDAY_LABELS[mondayIndex(date.getDay())].slice(0, 3);
  return `${weekday} ${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatWeekLabel(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return `${padDate(weekStart)} al ${padDate(weekEnd)}`;
}

function padDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function maxPoint(points: TrendPoint[]): TrendPoint | null {
  if (!points.length) return null;
  return points.reduce((best, point) => (point.amount > best.amount ? point : best));
}

function minPoint(points: TrendPoint[]): TrendPoint | null {
  if (!points.length) return null;
  return points.reduce((worst, point) => (point.amount < worst.amount ? point : worst));
}
