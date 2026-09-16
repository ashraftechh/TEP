import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  fetchTrainingAssignments,
  fetchMyTrainingAssignment,
  clearTrainingAssignments,
  clearMyTrainingAssignment,
} from '@/store/slices/trainingAssignmentSlice';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/context/ToastContext';
import type { TrainingAssignmentItem, TrainingAssignmentStatus } from '@/types/trainingAssignment';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Building2,
  Briefcase,
  Search,
  Filter,
  Download,
  FileText,
  Mail,
  Phone,
  MessageSquare,
  Eye,
  Loader2,
  AlertCircle,
  Users,
  Award,
  Calendar,
  CheckCircle2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  TrendingUp,
} from 'lucide-react';
import HighlightText from '@/components/ui/HighlightText';
import { cn } from '@/lib/utils';
import CompanyAttendanceModal from '@/components/attendance/CompanyAttendanceModal';
import SupervisorAttendanceModal from '@/components/attendance/SupervisorAttendanceModal';
import StudentAttendanceView from '@/components/attendance/StudentAttendanceView';

// ── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  if (!name) return '—';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`;
  }
  return parts[0].slice(0, 2);
}

function calculateDuration(
  startDate: string | null,
  endDate: string | null,
  isRTL: boolean
): string {
  if (!startDate || !endDate) return '—';
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '—';
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const months = Math.floor(diffDays / 30);
  const days = diffDays % 30;

  if (months > 0) {
    if (isRTL) {
      return `${months} شهر${days > 0 ? ` و ${days} يوم` : ''}`;
    }
    return `${months} month${months > 1 ? 's' : ''}${days > 0 ? ` and ${days} day${days > 1 ? 's' : ''}` : ''}`;
  }
  return isRTL ? `${days} يوم` : `${days} days`;
}

const getStatusColor = (status: TrainingAssignmentStatus): string => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800';
    case 'completed':
      return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
    case 'suspended':
      return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800';
    case 'terminated':
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
  }
};

function resolveText(value: unknown, language: string): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const loc = value as Record<string, string>;
    return loc[language] ?? loc['ar'] ?? loc['en'] ?? '';
  }
  return '';
}

function StatusBadge({ status }: { status: TrainingAssignmentStatus }) {
  const { t } = useTranslation('trainingAssignments');
  const label = t(`status.${status}`, status);
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs font-semibold px-2.5 py-0.5 rounded-full border',
        getStatusColor(status)
      )}
    >
      {label}
    </Badge>
  );
}

// ── Contact / Send Message Dialog ───────────────────────────────────────────
function SendMessageDialog({
  student,
  language,
  open,
  onOpenChange,
}: {
  student: TrainingAssignmentItem | null;
  language: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation('trainingAssignments');
  const toast = useToast();
  const isRTL = language === 'ar';
  const [message, setMessage] = useState('');

  const studentName = student?.student_profile?.user?.name ?? '';
  const studentEmail = student?.student_profile?.user?.email;

  const handleSend = () => {
    if (!message.trim()) {
      toast.error(isRTL ? 'الرجاء كتابة نص الرسالة' : 'Please enter a message');
      return;
    }

    if (studentEmail) {
      window.location.href = `mailto:${studentEmail}?subject=${encodeURIComponent(
        isRTL ? 'تدريب تعاوني' : 'Cooperative Training'
      )}&body=${encodeURIComponent(message)}`;
      toast.success(
        isRTL
          ? 'تم فتح تطبيق البريد لإرسال الرسالة إلى الطالب'
          : 'Email client opened to send message to student'
      );
    } else {
      toast.info(
        isRTL ? 'تم تسجيل الرسالة (البريد غير متوفر)' : 'Message logged (email not available)'
      );
    }

    setMessage('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>{t('sendMessage')}</DialogTitle>
          <DialogDescription>
            {t('sendMessageTo', {
              name: studentName,
              defaultValue: `إرسال رسالة إلى ${studentName}`,
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label htmlFor="send-message-text">{t('messageLabel')}</Label>
            <Textarea
              id="send-message-text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('messagePlaceholder')}
              className="mt-1 min-h-37.5"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => {
                setMessage('');
                onOpenChange(false);
              }}
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSend}
              className="gap-2 cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Mail className="w-4 h-4" />
              {t('send')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Company Details Dialog ──────────────────────────────────────────────────
function CompanyStudentDetailsDialog({
  assignment,
  language,
  onClose,
}: {
  assignment: TrainingAssignmentItem | null;
  language: string;
  onClose: () => void;
}) {
  const { t } = useTranslation('trainingAssignments');
  const isRTL = language === 'ar';

  if (!assignment) return null;

  const profile = assignment.student_profile;
  const studentName = profile?.user?.name ?? '—';
  const majorName = resolveText(profile?.major?.name, language);
  const opportunityTitle = resolveText(assignment.opportunity?.title, language);
  const companyName = resolveText(assignment.company?.name, language);

  return (
    <Dialog open={Boolean(assignment)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {t('studentDetails')}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            {t('studentDetailsSubtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Student Info */}
          <div className="flex items-start gap-4">
            <Avatar className="w-20 h-20 shrink-0 border border-border">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={studentName} className="object-cover" />
              ) : (
                <AvatarFallback className="text-xl font-bold bg-blue-100 text-blue-700">
                  {studentName.charAt(0) || 'ط'}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="text-gray-900 dark:text-gray-100 font-bold text-lg">{studentName}</h3>
              <p className="text-gray-600 dark:text-gray-400 font-mono text-sm mt-0.5">
                {profile?.student_number ?? '—'}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {majorName && <Badge variant="secondary">{majorName}</Badge>}
                {profile?.gpa !== null && profile?.gpa !== undefined && (
                  <Badge variant="outline">
                    {t('gpa')}: {profile.gpa}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 text-sm">
              <Mail className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="truncate">{profile?.user?.email || '—'}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 text-sm">
              <Phone className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="dir-ltr" dir="ltr">
                {profile?.phone || '—'}
              </span>
            </div>
          </div>

          <Separator />

          {/* Training Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t('trainingInfo')}
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">{t('opportunity')}</p>
                <p className="text-gray-900 dark:text-gray-100 font-medium mt-1">
                  {opportunityTitle || '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">{t('statusLabel')}</p>
                <div className="mt-1">
                  <StatusBadge status={assignment.status} />
                </div>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">{t('startDate')}</p>
                <p className="text-gray-900 dark:text-gray-100 font-medium mt-1">
                  <span dir="ltr" className="inline-block">
                    {assignment.start_date ?? '—'}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">{t('endDate')}</p>
                <p className="text-gray-900 dark:text-gray-100 font-medium mt-1">
                  <span dir="ltr" className="inline-block">
                    {assignment.end_date ?? '—'}
                  </span>
                </p>
              </div>
              {companyName && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">{t('company')}</p>
                  <p className="text-gray-900 dark:text-gray-100 font-medium mt-1">{companyName}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t('progress')}
              </h4>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                {assignment.progress_percentage ?? 0}%
              </span>
            </div>
            <Progress value={assignment.progress_percentage ?? 0} className="h-3" />
          </div>

          {/* Reports */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t('reports')}
            </h4>
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <FileText className="w-5 h-5 text-gray-500 shrink-0" />
              <span>
                {t('reportsSubmittedCount', {
                  submitted: assignment.reports_submitted_count ?? 0,
                  total: assignment.total_reports ?? assignment.required_reports_count ?? 0,
                })}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Supervisor Student Details Dialog — tabbed, matching prototype ──────────
function SupervisorStudentDetailsDialog({
  assignment,
  language,
  onClose,
}: {
  assignment: TrainingAssignmentItem | null;
  language: string;
  onClose: () => void;
}) {
  const { t } = useTranslation('trainingAssignments');
  const isRTL = language === 'ar';
  const [activeTab, setActiveTab] = useState<'basic' | 'training'>('basic');

  if (!assignment) return null;

  const profile = assignment.student_profile;
  const studentName = profile?.user?.name ?? '—';
  const majorName = resolveText(profile?.major?.name, language);
  const opportunityTitle = resolveText(assignment.opportunity?.title, language);
  const companyName = resolveText(assignment.company?.name, language);
  const fieldSupervisorName = assignment.field_supervisor?.name ?? null;
  const duration = calculateDuration(assignment.start_date, assignment.end_date, isRTL);

  const totalReports = assignment.total_reports ?? assignment.required_reports_count ?? 0;
  const submittedReports = assignment.reports_submitted_count ?? 0;
  const pendingReports = Math.max(0, totalReports - submittedReports);

  return (
    <Dialog open={Boolean(assignment)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {studentName}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            {isRTL ? 'تفاصيل الطالب والتدريب' : 'Student and training details'}
          </DialogDescription>
        </DialogHeader>

        {/* Tab Toggle — pill style matching prototype */}
        <div className="flex rounded-full bg-gray-100 dark:bg-gray-800 p-1 gap-1 mt-1">
          <button
            onClick={() => setActiveTab('basic')}
            className={cn(
              'flex-1 text-sm font-medium py-1.5 px-4 rounded-full transition-all',
              activeTab === 'basic'
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            {isRTL ? 'المعلومات الأساسية' : 'Basic Info'}
          </button>
          <button
            onClick={() => setActiveTab('training')}
            className={cn(
              'flex-1 text-sm font-medium py-1.5 px-4 rounded-full transition-all',
              activeTab === 'training'
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            {isRTL ? 'التدريب' : 'Training'}
          </button>
        </div>

        {/* Tab 1: Basic Info */}
        {activeTab === 'basic' && (
          <div className="space-y-5 pt-2">
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              {/* التخصص */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('major')}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                  {majorName || '—'}
                </p>
              </div>
              {/* الرقم الجامعي */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('studentId')}</p>
                <p className="text-sm font-semibold font-mono text-gray-900 dark:text-gray-100 mt-1">
                  <span dir="ltr" className="inline-block">
                    {profile?.student_number ?? '—'}
                  </span>
                </p>
              </div>
              {/* المعدل */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('gpa')}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                  {profile?.gpa !== null && profile?.gpa !== undefined
                    ? Number(profile.gpa).toFixed(2)
                    : '—'}
                </p>
              </div>
              {/* الحالة */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('statusLabel')}</p>
                <div className="mt-1">
                  <StatusBadge status={assignment.status} />
                </div>
              </div>
              {/* البريد الإلكتروني */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isRTL ? 'البريد الإلكتروني' : 'Email'}
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1 break-all">
                  {profile?.user?.email || '—'}
                </p>
              </div>
              {/* رقم الجوال */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('phone')}</p>
                <p className="text-sm font-semibold font-mono text-gray-900 dark:text-gray-100 mt-1">
                  <span dir="ltr" className="inline-block">
                    {profile?.phone || '—'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Training Info */}
        {activeTab === 'training' && (
          <div className="space-y-5 pt-2">
            <>
              {/* الشركة */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('company')}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                  {companyName || '—'}
                </p>
              </div>
              {/* المنصب */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('position')}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                  {opportunityTitle || '—'}
                </p>
              </div>
              {/* المشرف الميداني */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('fieldSupervisor')}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                  {fieldSupervisorName || '—'}
                </p>
              </div>
              {/* Dates — 2 columns */}
              <div className="grid grid-cols-2 gap-x-8">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('startDate')}</p>
                  <p className="text-sm font-semibold font-mono text-gray-900 dark:text-gray-100 mt-1">
                    <span dir="ltr" className="inline-block">
                      {assignment.start_date ?? '—'}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('endDate')}</p>
                  <p className="text-sm font-semibold font-mono text-gray-900 dark:text-gray-100 mt-1">
                    <span dir="ltr" className="inline-block">
                      {assignment.end_date ?? '—'}
                    </span>
                  </p>
                </div>
              </div>
              {/* Duration */}
              {duration !== '—' && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('duration')}</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                    {duration}
                  </p>
                </div>
              )}
              {/* Progress */}
              <div className="space-y-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('achievementRate')}</p>
                <div className="flex items-center gap-3" dir="ltr">
                  <Progress
                    value={assignment.progress_percentage ?? 0}
                    className="h-2.5 flex-1 bg-gray-100 dark:bg-gray-800"
                    indicatorClassName="bg-indigo-600"
                  />
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300 min-w-9 text-end">
                    {assignment.progress_percentage ?? 0}%
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span dir="ltr">
                    {submittedReports} / {totalReports}
                  </span>{' '}
                  {isRTL ? 'تقرير مقدم' : 'reports submitted'}
                </p>
              </div>
              {/* Pending reports badge if any */}
              {pendingReports > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{t('pendingReports')}:</span>
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300">
                    {pendingReports}
                  </Badge>
                </div>
              )}
            </>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Company Students Table Layout ───────────────────────────────────────────
function CompanyStudentsTable({
  assignments,
  language,
  searchTerm,
  onView,
  onContact,
  onAttendance,
}: {
  assignments: TrainingAssignmentItem[];
  language: string;
  searchTerm: string;
  onView: (a: TrainingAssignmentItem) => void;
  onContact: (a: TrainingAssignmentItem) => void;
  onAttendance: (a: TrainingAssignmentItem) => void;
}) {
  const { t } = useTranslation('trainingAssignments');
  const isRTL = language === 'ar';

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="border-b border-border/40 pb-4">
        <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {t('studentsList')} ({assignments.length})
        </CardTitle>
        <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
          {t('studentsListDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-start font-semibold">{t('student')}</TableHead>
                <TableHead className="text-start font-semibold">{t('studentId')}</TableHead>
                <TableHead className="text-start font-semibold">{t('major')}</TableHead>
                <TableHead className="text-start font-semibold">{t('opportunity')}</TableHead>
                <TableHead className="text-start font-semibold">{t('progress')}</TableHead>
                <TableHead className="text-start font-semibold">{t('reports')}</TableHead>
                <TableHead className="text-start font-semibold">{t('statusLabel')}</TableHead>
                <TableHead className="text-start font-semibold">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => {
                const profile = assignment.student_profile;
                const studentName = profile?.user?.name ?? '—';
                const majorName = resolveText(profile?.major?.name, language);
                const opportunityTitle = resolveText(assignment.opportunity?.title, language);

                return (
                  <TableRow key={assignment.id} className="hover:bg-muted/40 transition-colors">
                    {/* Student Info */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 shrink-0 border border-border/50">
                          {profile?.avatar_url ? (
                            <AvatarImage
                              src={profile.avatar_url}
                              alt={studentName}
                              className="object-cover"
                            />
                          ) : (
                            <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                              {studentName.charAt(0) || 'ط'}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="text-gray-900 dark:text-gray-100 font-medium text-sm">
                            <HighlightText text={studentName} query={searchTerm} />
                          </p>
                          {profile?.gpa !== undefined && profile?.gpa !== null && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {isRTL ? `المعدل: ${profile.gpa}` : `GPA: ${profile.gpa}`}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Student ID */}
                    <TableCell>
                      <p className="text-gray-900 dark:text-gray-100 text-sm font-mono">
                        <HighlightText text={profile?.student_number ?? '—'} query={searchTerm} />
                      </p>
                    </TableCell>

                    {/* Major */}
                    <TableCell>
                      <p className="text-gray-700 dark:text-gray-300 text-sm">
                        <HighlightText text={majorName || '—'} query={searchTerm} />
                      </p>
                    </TableCell>

                    {/* Opportunity */}
                    <TableCell>
                      <p className="text-gray-900 dark:text-gray-100 font-medium text-sm">
                        <HighlightText text={opportunityTitle || '—'} query={searchTerm} />
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 whitespace-nowrap">
                        <span dir="ltr" className="inline-block">
                          {assignment.start_date ?? '—'} - {assignment.end_date ?? '—'}
                        </span>
                      </p>
                    </TableCell>

                    {/* Progress */}
                    <TableCell>
                      <div className="w-24 space-y-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            {assignment.progress_percentage ?? 0}%
                          </span>
                        </div>
                        <Progress value={assignment.progress_percentage ?? 0} className="h-2" />
                      </div>
                    </TableCell>

                    {/* Reports */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                        <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="font-medium">
                          {assignment.reports_submitted_count ?? 0}/
                          {assignment.total_reports ?? assignment.required_reports_count ?? 0}
                        </span>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <StatusBadge status={assignment.status} />
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="cursor-pointer h-8 w-8 p-0 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
                          onClick={() => onView(assignment)}
                          title={t('viewDetails')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="cursor-pointer h-8 w-8 p-0 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
                          onClick={() => onContact(assignment)}
                          title={t('sendMessage')}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                        {assignment.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="cursor-pointer h-8 w-8 p-0 text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300"
                            onClick={() => onAttendance(assignment)}
                            title={t('attendance')}
                            aria-label={t('attendance')}
                          >
                            <ClipboardList className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Supervisor Student Card Layout (matching supervisor prototype) ──────────
function SupervisorStudentCard({
  assignment,
  language,
  searchTerm,
  onView,
  onContact,
  onAttendance,
}: {
  assignment: TrainingAssignmentItem;
  language: string;
  searchTerm: string;
  onView: (a: TrainingAssignmentItem) => void;
  onContact: (a: TrainingAssignmentItem) => void;
  onAttendance: (a: TrainingAssignmentItem) => void;
}) {
  const { t } = useTranslation('trainingAssignments');
  const profile = assignment.student_profile;
  const studentName = profile?.user?.name ?? '—';
  const majorName = resolveText(profile?.major?.name, language);
  const companyName = resolveText(assignment.company?.name, language);
  const opportunityTitle = resolveText(assignment.opportunity?.title, language);

  return (
    <Card className="border-border/60 shadow-xs hover:shadow-md transition-shadow bg-surface">
      <CardContent className="p-6">
        {/* 3 Columns in a Grid: Student Info (5 cols), Company & Progress (5 cols), Action Buttons (2 cols) */}
        <div className="grid grid-cols-1 md:grid-cols-12 items-start gap-6">
          {/* Column 1 (Right in RTL, Left in LTR): Avatar + Student Details + Contact Info */}
          <div className="md:col-span-5 flex items-start gap-3.5">
            <Avatar className="h-11 w-11 shrink-0 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-900 text-xs">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={studentName} className="object-cover" />
              ) : (
                <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold">
                  {getInitials(studentName)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                  <HighlightText text={studentName} query={searchTerm} />
                </span>
                <StatusBadge status={assignment.status} />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-start">
                {t('studentId')}:{' '}
                <span className="font-mono text-gray-700 dark:text-gray-300">
                  <HighlightText text={profile?.student_number ?? '—'} query={searchTerm} />
                </span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-start">
                {t('major')}:{' '}
                <span className="text-gray-700 dark:text-gray-300">
                  <HighlightText text={majorName || '—'} query={searchTerm} />
                </span>
              </p>
              {profile?.gpa !== undefined && profile?.gpa !== null && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-start">
                  {t('gpa')}:{' '}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {Number(profile.gpa).toFixed(2)}
                  </span>
                </p>
              )}
              {/* Contact line: Icons come before text in reading direction */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-1">
                {profile?.user?.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate max-w-47.5">{profile.user.email}</span>
                  </div>
                )}
                {profile?.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="font-mono" dir="ltr">
                      {profile.phone}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Column 2 (Middle): Company, Position, Period & Progress Bar (Start-aligned, not centered) */}
          <div className="md:col-span-5 flex flex-col items-start justify-start text-start space-y-3">
            <div className="space-y-2 w-full text-start">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>{t('company')}</span>
                </div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm mt-0.5 text-start">
                  {companyName || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-start">
                  {t('position')}
                </p>
                <p className="text-xs text-gray-700 dark:text-gray-300 font-medium mt-0.5 text-start">
                  {opportunityTitle || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-start">{t('period')}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mt-0.5 text-start whitespace-nowrap">
                  <span dir="ltr" className="inline-block">
                    {assignment.start_date && assignment.end_date
                      ? `${assignment.start_date} - ${assignment.end_date}`
                      : '—'}
                  </span>
                </p>
              </div>
            </div>

            <div className="w-full pt-1 space-y-1.5 text-start">
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium text-start">
                {t('achievementRate')}
              </div>
              <div className="flex items-center gap-2.5" dir="ltr">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 min-w-7 text-start">
                  {assignment.progress_percentage ?? 0}%
                </span>
                <Progress
                  value={assignment.progress_percentage ?? 0}
                  className="h-2 flex-1 bg-gray-100 dark:bg-gray-800"
                  indicatorClassName="bg-indigo-600"
                />
              </div>
              <div className="pt-0.5 text-start">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {t('reportCount', {
                    submitted: assignment.reports_submitted_count ?? 0,
                    total: assignment.total_reports ?? assignment.required_reports_count ?? 12,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Column 3 (Left in RTL, Right in LTR): 3 stacked action buttons */}
          <div className="md:col-span-2 flex flex-row md:flex-col gap-2 justify-end md:items-end w-full">
            <Button
              variant="outline"
              size="sm"
              className="w-24 justify-center gap-1.5 text-xs cursor-pointer border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800"
              onClick={() => onView(assignment)}
            >
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span>{t('details')}</span>
            </Button>
            <Button
              size="sm"
              className="w-24 justify-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs"
              onClick={() => onContact(assignment)}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span>{t('message')}</span>
            </Button>
            {assignment.status === 'active' && (
              <Button
                variant="outline"
                size="sm"
                className="w-24 justify-center gap-1.5 text-xs cursor-pointer border-indigo-300 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                onClick={() => onAttendance(assignment)}
              >
                <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                <span>{t('attendance')}</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Company / Supervisor list view (shared data-fetching shell) ────────────
function AssignmentsListView({ variant }: { variant: 'company' | 'supervisor' }) {
  const { t, i18n } = useTranslation(['trainingAssignments', 'common']);
  const toast = useToast();
  const language = i18n.language || 'ar';
  const isRTL = language === 'ar';
  const isSupervisor = variant === 'supervisor';
  const dispatch = useAppDispatch();
  const { assignments, pagination, isFetchingList, fetchListError } = useAppSelector(
    (state) => state.trainingAssignment
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [opportunityFilter, setOpportunityFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selected, setSelected] = useState<TrainingAssignmentItem | null>(null);
  const [contactTarget, setContactTarget] = useState<TrainingAssignmentItem | null>(null);
  const [attendanceTarget, setAttendanceTarget] = useState<TrainingAssignmentItem | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleOpportunityChange = (val: string) => {
    setOpportunityFilter(val);
    setCurrentPage(1);
  };

  const handleCompanyChange = (val: string) => {
    setCompanyFilter(val);
    setCurrentPage(1);
  };

  const load = useMemo(
    () => () =>
      dispatch(
        fetchTrainingAssignments({
          status: statusFilter === 'all' ? undefined : (statusFilter as TrainingAssignmentStatus),
          q: searchTerm || undefined,
          page: currentPage,
        })
      ),
    [dispatch, statusFilter, searchTerm, currentPage]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 300);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    return () => {
      dispatch(clearTrainingAssignments());
    };
  }, [dispatch]);

  // Derive unique company list for filter
  const companies = useMemo(() => {
    return Array.from(
      new Set(
        assignments
          .map((a) =>
            resolveText(a.company?.name ?? a.application?.opportunity?.company?.name, language)
          )
          .filter(Boolean)
      )
    );
  }, [assignments, language]);

  // Derive unique opportunity list for filter
  const opportunities = useMemo(() => {
    return Array.from(
      new Set(assignments.map((a) => resolveText(a.opportunity?.title, language)).filter(Boolean))
    );
  }, [assignments, language]);

  // Filtering for opportunity and company
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (opportunityFilter !== 'all') {
        const oppTitle = resolveText(a.opportunity?.title, language);
        if (oppTitle !== opportunityFilter) return false;
      }
      if (companyFilter !== 'all') {
        const compName = resolveText(
          a.company?.name ?? a.application?.opportunity?.company?.name,
          language
        );
        if (compName !== companyFilter) return false;
      }
      return true;
    });
  }, [assignments, opportunityFilter, companyFilter, language]);

  // Compute statistics matching prototypes
  const stats = useMemo(() => {
    const total = pagination?.total ?? assignments.length;
    const active = assignments.filter((a) => a.status === 'active').length;
    const completed = assignments.filter((a) => a.status === 'completed').length;
    const avgProgress =
      assignments.length > 0
        ? Math.round(
            assignments.reduce((acc, a) => acc + (a.progress_percentage ?? 0), 0) /
              assignments.length
          )
        : 0;
    return { total, active, completed, avgProgress };
  }, [assignments, pagination]);

  const handleExport = () => {
    if (filteredAssignments.length === 0) {
      toast.error(language === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export');
      return;
    }

    const headers = [
      language === 'ar' ? 'اسم الطالب' : 'Student Name',
      language === 'ar' ? 'الرقم الجامعي' : 'Student ID',
      language === 'ar' ? 'التخصص' : 'Major',
      language === 'ar' ? 'المعدل' : 'GPA',
      language === 'ar' ? 'الفرصة' : 'Opportunity',
      language === 'ar' ? 'تاريخ البدء' : 'Start Date',
      language === 'ar' ? 'تاريخ الانتهاء' : 'End Date',
      language === 'ar' ? 'نسبة التقدم' : 'Progress %',
      language === 'ar' ? 'التقارير' : 'Reports',
      language === 'ar' ? 'الحالة' : 'Status',
    ];

    const rows = filteredAssignments.map((a) => [
      `"${(a.student_profile?.user?.name ?? '').replace(/"/g, '""')}"`,
      `"${(a.student_profile?.student_number ?? '').replace(/"/g, '""')}"`,
      `"${(resolveText(a.student_profile?.major?.name, language) || '').replace(/"/g, '""')}"`,
      `"${a.student_profile?.gpa ?? ''}"`,
      `"${(resolveText(a.opportunity?.title, language) || '').replace(/"/g, '""')}"`,
      `"${a.start_date ?? ''}"`,
      `"${a.end_date ?? ''}"`,
      `"${a.progress_percentage ?? 0}%"`,
      `"${a.reports_submitted_count ?? 0}/${a.total_reports ?? a.required_reports_count ?? 0}"`,
      `"${t(`status.${a.status}`, a.status)}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `students_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(language === 'ar' ? 'تم تصدير البيانات بنجاح' : 'Data exported successfully');
  };

  const title = isSupervisor ? t('supervisorTitle') : t('companyTitle');
  const subtitle = isSupervisor ? t('supervisorSubtitle') : t('companySubtitle');

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          {title}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
      </div>

      {/* Statistics Cards */}
      {isSupervisor ? (
        // Supervisor Top Stat Cards (matching Supervisor Prototype Screenshot 1)
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* 1. Total Students */}
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{t('totalStudents')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {stats.total}
                  </p>
                </div>
                <User className="w-8 h-8 text-indigo-600" />
              </div>
            </CardContent>
          </Card>

          {/* 2. In Training (Active) */}
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{t('inTraining')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {stats.active}
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          {/* 3. Completed */}
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {t('completedSupervisor')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {stats.completed}
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          {/* 4. Average Progress */}
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{t('avgProgress')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {stats.avgProgress}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        // Company Top Stat Cards (matching Company Accepted Students Prototype)
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{t('totalStudents')}</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{t('activeStudents')}</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
                </div>
                <Award className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {t('completedStudents')}
                  </p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">{stats.completed}</p>
                </div>
                <FileText className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{t('avgProgress')}</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">{stats.avgProgress}%</p>
                </div>
                <Calendar className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters — matching prototype */}
      <Card className="border-border/60 shadow-sm bg-white dark:bg-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            {/* Search — flex-1 takes remaining space */}
            <div className="flex-1 relative w-full">
              <Search className="absolute inset-s-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <Input
                placeholder={isSupervisor ? t('searchSupervisor') : t('searchPlaceholder')}
                value={searchTerm}
                onChange={handleSearchChange}
                className="ps-10 pe-4 h-10 text-sm bg-gray-100/80 dark:bg-gray-800/80 border-0 shadow-none focus-visible:ring-1 focus-visible:ring-primary/20 rounded-lg placeholder:text-gray-400 w-full"
              />
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-37.5 shrink-0">
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full h-10 text-sm cursor-pointer border-0 shadow-none focus:ring-0 bg-gray-100/80 dark:bg-gray-800/80 rounded-lg px-3 text-gray-700 dark:text-gray-200">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <Filter className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <SelectValue placeholder={t('filterStatus')} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all')}</SelectItem>
                  <SelectItem value="active">{t('status.active')}</SelectItem>
                  <SelectItem value="completed">{t('status.completed')}</SelectItem>
                  <SelectItem value="suspended">{t('status.suspended')}</SelectItem>
                  <SelectItem value="terminated">{t('status.terminated')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Company Filter (Supervisors / Multi-company views) */}
            {isSupervisor && companies.length > 0 && (
              <div className="w-full md:w-44 shrink-0">
                <Select value={companyFilter} onValueChange={handleCompanyChange}>
                  <SelectTrigger className="w-full h-10 text-sm cursor-pointer border-0 shadow-none focus:ring-0 bg-gray-100/80 dark:bg-gray-800/80 rounded-lg px-3 text-gray-700 dark:text-gray-200">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <Building2 className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      <SelectValue
                        placeholder={t('allCompanies', { defaultValue: 'All Companies' })}
                      />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t('allCompanies', { defaultValue: 'All Companies' })}
                    </SelectItem>
                    {companies.map((comp, idx) => (
                      <SelectItem key={idx} value={comp}>
                        {comp}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Opportunity Filter (Supervisors and Companies) */}
            {opportunities.length > 0 && (
              <div className="w-full md:w-44 shrink-0">
                <Select value={opportunityFilter} onValueChange={handleOpportunityChange}>
                  <SelectTrigger className="w-full h-10 text-sm cursor-pointer border-0 shadow-none focus:ring-0 bg-gray-100/80 dark:bg-gray-800/80 rounded-lg px-3 text-gray-700 dark:text-gray-200">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <Briefcase className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      <SelectValue
                        placeholder={t('allOpportunities', { defaultValue: 'All Opportunities' })}
                      />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t('allOpportunities', { defaultValue: 'All Opportunities' })}
                    </SelectItem>
                    {opportunities.map((opp, index) => (
                      <SelectItem key={index} value={opp}>
                        {opp}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Export Button */}
            <Button
              variant="outline"
              size="sm"
              className="gap-2 cursor-pointer shrink-0 h-10 text-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 rounded-lg px-3.5 shadow-none hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
              onClick={handleExport}
            >
              <span>{t('export')}</span>
              <Download className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {isFetchingList && (
        <div className="flex items-center justify-center py-16 text-foreground-muted gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{t('loading')}</span>
        </div>
      )}

      {/* Error state */}
      {!isFetchingList && fetchListError && (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="h-10 w-10 mx-auto text-red-500" />
            <p className="text-foreground-muted">{t('errorLoading')}</p>
            <Button variant="outline" className="cursor-pointer" onClick={load}>
              {t('retry')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isFetchingList && !fetchListError && filteredAssignments.length === 0 && (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-foreground-muted">
              {searchTerm || statusFilter !== 'all' || opportunityFilter !== 'all'
                ? t('noStudents')
                : t('noStudentsAtAll')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main List: Company Table vs Supervisor Cards */}
      {!isFetchingList &&
        !fetchListError &&
        filteredAssignments.length > 0 &&
        (isSupervisor ? (
          <div className="space-y-4">
            {filteredAssignments.map((assignment) => (
              <SupervisorStudentCard
                key={assignment.id}
                assignment={assignment}
                language={language}
                searchTerm={searchTerm}
                onView={setSelected}
                onContact={setContactTarget}
                onAttendance={setAttendanceTarget}
              />
            ))}
          </div>
        ) : (
          <CompanyStudentsTable
            assignments={filteredAssignments}
            language={language}
            searchTerm={searchTerm}
            onView={setSelected}
            onContact={setContactTarget}
            onAttendance={setAttendanceTarget}
          />
        ))}

      {/* Pagination Controls */}
      {pagination && pagination.total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-slate-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {isRTL ? (
              <span>
                عرض {pagination.from || 1} إلى {pagination.to || filteredAssignments.length} من أصل{' '}
                {pagination.total} طالب
              </span>
            ) : (
              <span>
                Showing {pagination.from || 1} to {pagination.to || filteredAssignments.length} of{' '}
                {pagination.total} students
              </span>
            )}
          </div>

          <div className="flex items-center flex-wrap justify-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || isFetchingList}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              className="text-xs cursor-pointer h-8 px-2.5"
            >
              {isRTL ? (
                <>
                  <ChevronRight className="h-3.5 w-3.5 me-1" />
                  السابق
                </>
              ) : (
                <>
                  <ChevronLeft className="h-3.5 w-3.5 me-1" />
                  Previous
                </>
              )}
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: pagination.last_page }, (_, i) => i + 1)
                .filter((p) => {
                  return p === 1 || p === pagination.last_page || Math.abs(p - currentPage) <= 1;
                })
                .map((pageNum, idx, arr) => {
                  const prevPage = arr[idx - 1];
                  const showEllipsis = prevPage && pageNum - prevPage > 1;
                  return (
                    <React.Fragment key={pageNum}>
                      {showEllipsis && <span className="text-xs text-gray-400 px-1">…</span>}
                      <Button
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        disabled={isFetchingList}
                        className={`h-8 w-8 p-0 text-xs cursor-pointer ${
                          currentPage === pageNum
                            ? 'bg-university-primary text-white border-university-primary'
                            : ''
                        }`}
                      >
                        {pageNum}
                      </Button>
                    </React.Fragment>
                  );
                })}
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= pagination.last_page || isFetchingList}
              onClick={() => setCurrentPage((prev) => Math.min(pagination.last_page, prev + 1))}
              className="text-xs cursor-pointer h-8 px-2.5"
            >
              {isRTL ? (
                <>
                  التالي
                  <ChevronLeft className="h-3.5 w-3.5 ms-1" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-3.5 w-3.5 ms-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Details Dialog */}
      {isSupervisor ? (
        <SupervisorStudentDetailsDialog
          assignment={selected}
          language={language}
          onClose={() => setSelected(null)}
        />
      ) : (
        <CompanyStudentDetailsDialog
          assignment={selected}
          language={language}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Send Message Dialog */}
      <SendMessageDialog
        open={Boolean(contactTarget)}
        onOpenChange={(open) => !open && setContactTarget(null)}
        student={contactTarget}
        language={language}
      />

      {/* Attendance Modal */}
      {isSupervisor ? (
        <SupervisorAttendanceModal
          assignment={attendanceTarget}
          open={Boolean(attendanceTarget)}
          onOpenChange={(open) => !open && setAttendanceTarget(null)}
        />
      ) : (
        <CompanyAttendanceModal
          assignment={attendanceTarget}
          open={Boolean(attendanceTarget)}
          onOpenChange={(open) => !open && setAttendanceTarget(null)}
        />
      )}
    </div>
  );
}

// ── Student single-placement view ───────────────────────────────────────────
function MyPlacementView() {
  const { t, i18n } = useTranslation(['trainingAssignments', 'common']);
  const language = i18n.language || 'ar';
  const dispatch = useAppDispatch();
  const {
    myAssignment,
    isFetchingMyAssignment,
    fetchMyAssignmentError,
    fetchMyAssignmentErrorCode,
  } = useAppSelector((state) => state.trainingAssignment);
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchMyTrainingAssignment());
    return () => {
      dispatch(clearMyTrainingAssignment());
    };
  }, [dispatch]);

  const noPlacement = fetchMyAssignmentErrorCode === 'no_active_assignment';

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard"
          className="text-foreground-muted hover:text-foreground cursor-pointer inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('backToDashboard')}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          {t('myPlacementTitle')}
        </h1>
        <p className="text-sm text-foreground-muted mt-1">{t('myPlacementSubtitle')}</p>
      </div>

      {isFetchingMyAssignment && (
        <div className="flex items-center justify-center py-16 text-foreground-muted gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{t('loading')}</span>
        </div>
      )}

      {!isFetchingMyAssignment && noPlacement && (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-12 text-center space-y-2">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="font-medium text-foreground">{t('noPlacementTitle')}</p>
            <p className="text-sm text-foreground-muted">{t('noPlacementSubtitle')}</p>
          </CardContent>
        </Card>
      )}

      {!isFetchingMyAssignment && !noPlacement && fetchMyAssignmentError && (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="h-10 w-10 mx-auto text-red-500" />
            <p className="text-foreground-muted">{t('errorLoading')}</p>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => dispatch(fetchMyTrainingAssignment())}
            >
              {t('retry')}
            </Button>
          </CardContent>
        </Card>
      )}

      {!isFetchingMyAssignment && myAssignment && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14">
                  {myAssignment.company?.logo_url ? (
                    <AvatarImage
                      src={myAssignment.company.logo_url}
                      className="object-contain bg-white"
                    />
                  ) : (
                    <AvatarFallback>
                      <Building2 className="h-6 w-6" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <CardTitle className="text-lg">
                    {resolveText(myAssignment.company?.name, language) || '—'}
                  </CardTitle>
                  <p className="text-sm text-foreground-muted">
                    {resolveText(myAssignment.opportunity?.title, language)}
                  </p>
                </div>
              </div>
              <StatusBadge status={myAssignment.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-foreground-muted">{t('startDate')}</p>
                <p className="text-foreground mt-0.5">
                  <span dir="ltr" className="inline-block">
                    {myAssignment.start_date ?? '—'}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-foreground-muted">{t('endDate')}</p>
                <p className="text-foreground mt-0.5">
                  <span dir="ltr" className="inline-block">
                    {myAssignment.end_date ?? '—'}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-foreground-muted">{t('supervisor')}</p>
                <p className="text-foreground mt-0.5">
                  {myAssignment.academic_supervisor?.name ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-foreground-muted">{t('fieldSupervisor')}</p>
                <p className="text-foreground mt-0.5">
                  {myAssignment.field_supervisor?.name ?? '—'}
                </p>
              </div>
            </div>

            {myAssignment.academic_supervisor?.email && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer gap-2"
                  onClick={() => setContactOpen(true)}
                >
                  <Mail className="h-4 w-4" />
                  {t('contactSupervisor')}
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground">{t('progress')}</h4>
                <span className="text-sm text-foreground">{myAssignment.progress_percentage}%</span>
              </div>
              <Progress value={myAssignment.progress_percentage} />
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">{t('reports')}</h4>
              <div className="flex items-center gap-1.5 text-sm text-foreground">
                <FileText className="h-4 w-4 text-gray-400" />
                <span>
                  {t('reportsSubmittedCount', {
                    submitted: myAssignment.reports_submitted_count ?? 0,
                    total: myAssignment.total_reports ?? myAssignment.required_reports_count ?? 0,
                  })}
                </span>
              </div>
            </div>

            {myAssignment.latest_attendance_status && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">{t('latestAttendance')}</h4>
                <p className="text-sm text-foreground">
                  {t(`attendanceStatus.${myAssignment.latest_attendance_status}`)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Student Attendance History */}
      {!isFetchingMyAssignment && myAssignment && myAssignment.status === 'active' && (
        <StudentAttendanceView assignmentId={myAssignment.id} />
      )}

      {/* Send Message Dialog for student contacting supervisor */}
      <SendMessageDialog
        open={contactOpen}
        onOpenChange={setContactOpen}
        student={
          myAssignment
            ? ({
                ...myAssignment,
                student_profile: {
                  id: 0,
                  student_number: '',
                  gpa: null,
                  user: {
                    id: myAssignment.academic_supervisor?.id ?? 0,
                    name: myAssignment.academic_supervisor?.name ?? '',
                    email: myAssignment.academic_supervisor?.email ?? '',
                  },
                },
              } as unknown as TrainingAssignmentItem)
            : null
        }
        language={language}
      />
    </div>
  );
}

// ── Entry point ─────────────────────────────────────────────────────────────
export function TrainingAssignmentsPage() {
  const { t } = useTranslation('trainingAssignments');
  const { hasRole } = usePermissions();

  useEffect(() => {
    document.title = `${t('pageTitleSuffix')} | Training Ecosystem`;
  }, [t]);

  if (hasRole('company_representative')) {
    return <AssignmentsListView variant="company" />;
  }

  if (hasRole('academic_supervisor')) {
    return <AssignmentsListView variant="supervisor" />;
  }

  if (hasRole('student')) {
    return <MyPlacementView />;
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto text-center space-y-2">
      <h1 className="text-xl font-semibold text-foreground">{t('unknownRoleTitle')}</h1>
      <p className="text-foreground-muted">{t('unknownRoleSubtitle')}</p>
    </div>
  );
}

export default TrainingAssignmentsPage;
