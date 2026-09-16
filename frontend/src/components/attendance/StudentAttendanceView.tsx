import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchAssignmentAttendance } from '@/store/slices/attendanceSlice';
import type { AttendanceStatus } from '@/types/attendance';
import { AttendanceSummaryStats } from './AttendanceSummaryStats';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  CalendarCheck,
  CalendarX,
  Clock,
  FileText,
  Loader2,
  Calendar,
  AlertCircle,
} from 'lucide-react';

interface StudentAttendanceViewProps {
  assignmentId: number;
}

export const StudentAttendanceView: React.FC<StudentAttendanceViewProps> = ({ assignmentId }) => {
  const { t } = useTranslation('attendance');
  const dispatch = useAppDispatch();
  const {
    records = [],
    summary = null,
    isFetching = false,
  } = useAppSelector((state) => state.attendance || {});

  useEffect(() => {
    if (assignmentId) {
      dispatch(fetchAssignmentAttendance({ assignmentId }));
    }
  }, [assignmentId, dispatch]);

  const getStatusBadge = (recStatus: AttendanceStatus) => {
    switch (recStatus) {
      case 'present':
        return (
          <Badge
            variant="outline"
            className="bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300 gap-1 text-xs"
          >
            <CalendarCheck className="w-3 h-3" />
            {t('present')}
          </Badge>
        );
      case 'absent':
        return (
          <Badge
            variant="outline"
            className="bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 gap-1 text-xs"
          >
            <CalendarX className="w-3 h-3" />
            {t('absent')}
          </Badge>
        );
      case 'late':
        return (
          <Badge
            variant="outline"
            className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 gap-1 text-xs"
          >
            <Clock className="w-3 h-3" />
            {t('late')}
          </Badge>
        );
      case 'excused':
        return (
          <Badge
            variant="outline"
            className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 gap-1 text-xs"
          >
            <FileText className="w-3 h-3" />
            {t('excused')}
          </Badge>
        );
    }
  };

  const getApprovalBadge = (appStatus: string) => {
    switch (appStatus) {
      case 'approved':
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 text-xs"
          >
            {t('approved')}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 text-xs"
          >
            {t('rejected')}
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 text-xs"
          >
            {t('pending')}
          </Badge>
        );
    }
  };

  return (
    <Card className="border-border/60 shadow-sm mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary stats */}
        <AttendanceSummaryStats summary={summary} />

        {/* Table of records */}
        {isFetching ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">{t('common:loading')}</span>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-lg">
            <AlertCircle className="w-7 h-7 text-muted-foreground/50 mx-auto mb-1.5" />
            <p className="text-xs font-medium text-foreground">{t('noRecords')}</p>
            <p className="text-[11px] text-muted-foreground">{t('noRecordsDescription')}</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start text-xs">{t('attendanceDate')}</TableHead>
                  <TableHead className="text-start text-xs">{t('status')}</TableHead>
                  <TableHead className="text-start text-xs">{t('reason')}</TableHead>
                  <TableHead className="text-start text-xs">{t('approvalStatus')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      <span dir="ltr">{rec.attendance_date}</span>
                    </TableCell>
                    <TableCell>{getStatusBadge(rec.status)}</TableCell>
                    <TableCell className="text-xs max-w-xs truncate text-muted-foreground">
                      {rec.reason || '—'}
                    </TableCell>
                    <TableCell>{getApprovalBadge(rec.approval_status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentAttendanceView;
