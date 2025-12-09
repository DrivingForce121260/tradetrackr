export function isOverdue(now: Date, due: Date, status: string): boolean {
  if (!due) return false;
  const active = status !== 'done' && status !== 'archived';
  return active && due.getTime() < now.getTime();
}

export function isOverduePlus1h(now: Date, due: Date, status: string): boolean {
  if (!due) return false;
  const active = status !== 'done' && status !== 'archived';
  return active && now.getTime() > (due.getTime() + 1 * 3600 * 1000);
}

export function isWithinNext24h(now: Date, due: Date, status: string): boolean {
  if (!due) return false;
  const active = status !== 'done' && status !== 'archived';
  const diff = due.getTime() - now.getTime();
  return active && diff >= 0 && diff <= 24 * 3600 * 1000;
}















