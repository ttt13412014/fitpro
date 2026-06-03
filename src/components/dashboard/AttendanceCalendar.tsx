'use client';

import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from 'lucide-react';

interface Props {
  dates: string[];
}

export function AttendanceCalendar({ dates }: Props) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const dateSet = new Set(dates);

  const weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const startDay = (monthStart.getDay() + 6) % 7; // Monday = 0

  const trained = dates.filter(d => {
    const parsed = new Date(d);
    return isSameMonth(parsed, now);
  }).length;

  const pct = Math.round((trained / days.length) * 100);

  return (
    <div className="card h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="section-title">Asistencia</h3>
          <p className="text-xs text-text-muted mt-0.5 capitalize">
            {format(now, 'MMMM yyyy', { locale: es })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold font-display text-accent-green">{pct}%</p>
          <p className="text-[10px] text-text-muted">{trained}/{days.length} días</p>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekdays.map(d => (
          <div key={d} className="text-center text-[10px] text-text-muted font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const trained = dateSet.has(dateStr);
          const isToday = format(now, 'yyyy-MM-dd') === dateStr;

          return (
            <div
              key={dateStr}
              className={`
                aspect-square rounded-lg flex items-center justify-center text-[10px] font-medium
                transition-all
                ${trained ? 'bg-accent-green/20 text-accent-green' : 'text-text-muted'}
                ${isToday ? 'ring-1 ring-accent-primary' : ''}
              `}
            >
              {format(day, 'd')}
            </div>
          );
        })}
      </div>
    </div>
  );
}
