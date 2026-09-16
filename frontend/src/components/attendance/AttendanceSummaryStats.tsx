import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AttendanceSummary } from '@/types/attendance';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, Clock, FileText, CalendarCheck2, AlertCircle } from 'lucide-react';

interface AttendanceSummaryStatsProps {
  summary: AttendanceSummary | null;
}

export const AttendanceSummaryStats: React.FC<AttendanceSummaryStatsProps> = ({ summary }) => {
  const { t } = useTranslation('attendance');

  if (!summary) return null;

  const totalDays =
    summary.valid_days ?? Math.max(0, (summary.total_days || 0) - (summary.rejected_count || 0));
  const presentDays = summary.present_days || 0;
  const excusedDays = summary.excused_days || 0;
  const rejectedCount = summary.rejected_count || 0;
  const evaluatedDays = Math.max(0, totalDays - excusedDays);

  let attendanceRate = 0;
  if (evaluatedDays > 0) {
    attendanceRate = Math.min(100, Math.max(0, Math.round((presentDays / evaluatedDays) * 100)));
  } else if (totalDays > 0) {
    attendanceRate = 100;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Total Days */}
      <Card className="border-border/60 shadow-xs bg-surface">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{t('stats.totalDays')}</p>
            <p className="text-lg font-bold text-foreground mt-0.5">
              {totalDays}
              {rejectedCount > 0 && (
                <span className="text-xs font-normal text-muted-foreground ms-1.5">
                  ({summary.total_days} {t('stats.totalLogged')})
                </span>
              )}
            </p>
          </div>
          <CalendarCheck2 className="w-5 h-5 text-indigo-500 shrink-0" />
        </CardContent>
      </Card>

      {/* 2. Present Days */}
      <Card className="border-border/60 shadow-xs bg-surface">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{t('stats.presentDays')}</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400 mt-0.5">
              {summary.present_days}
            </p>
          </div>
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
        </CardContent>
      </Card>

      {/* 3. Absent Days */}
      <Card className="border-border/60 shadow-xs bg-surface">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{t('stats.absentDays')}</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400 mt-0.5">
              {summary.absent_days}
            </p>
          </div>
          <XCircle className="w-5 h-5 text-red-600 shrink-0" />
        </CardContent>
      </Card>

      {/* 4. Late Days */}
      <Card className="border-border/60 shadow-xs bg-surface">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{t('stats.lateDays')}</p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {summary.late_days}
            </p>
          </div>
          <Clock className="w-5 h-5 text-amber-600 shrink-0" />
        </CardContent>
      </Card>

      {/* 5. Excused Days */}
      <Card className="border-border/60 shadow-xs bg-surface">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{t('stats.excusedDays')}</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">
              {summary.excused_days}
            </p>
          </div>
          <FileText className="w-5 h-5 text-blue-600 shrink-0" />
        </CardContent>
      </Card>

      {/* 6. Rate / Pending */}
      <Card className="border-border/60 shadow-xs bg-surface">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{t('stats.attendanceRate')}</p>
            <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
              {attendanceRate}%
            </p>
          </div>
          <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0" />
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceSummaryStats;
