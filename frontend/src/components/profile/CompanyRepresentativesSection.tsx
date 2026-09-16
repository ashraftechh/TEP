import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  fetchCompanyRepresentatives,
  inviteCompanyRepresentative,
  updateCompanyRepresentativeMe,
  updateCompanyRepresentative,
  removeCompanyRepresentative,
  clearRepresentativeErrors,
} from '@/store/slices/companyRepresentativesSlice';
import { fetchProfile } from '@/store/slices/profileSlice';
import { useToast } from '@/context/ToastContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Mail,
  Phone,
  Calendar,
  Edit2,
  Check,
  X,
  Trash2,
  LogOut,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import type { CompanyRepresentativeItem } from '@/types/representative';

export const CompanyRepresentativesSection: React.FC = () => {
  const { t, i18n } = useTranslation(['companies', 'common']);
  const isArabic = i18n.language === 'ar';
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast = useToast();

  const { user } = useAppSelector((state) => state.auth);
  const currentUserId = user?.id;

  const {
    representatives,
    isAdmin,
    status,
    inviteStatus,
    updateStatus,
    removeStatus,
    validationErrors,
  } = useAppSelector((state) => state.companyRepresentatives);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteEmailError, setInviteEmailError] = useState<string | null>(null);
  const [editingRepId, setEditingRepId] = useState<number | null>(null);
  const [editingJobTitle, setEditingJobTitle] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    rep: CompanyRepresentativeItem | null;
    isLeave: boolean;
  }>({
    isOpen: false,
    rep: null,
    isLeave: false,
  });

  useEffect(() => {
    dispatch(fetchCompanyRepresentatives());
  }, [dispatch]);

  const validateInviteEmail = (val: string): string | null => {
    if (!val.trim()) {
      return t('auth:login.errors.emailRequired', 'Email is required');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val.trim())) {
      return t('auth:login.errors.emailInvalid', 'Please enter a valid email address');
    }
    return null;
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const clientErr = validateInviteEmail(inviteEmail);
    if (clientErr) {
      setInviteEmailError(clientErr);
      return;
    }

    setInviteEmailError(null);
    dispatch(clearRepresentativeErrors());
    const result = await dispatch(inviteCompanyRepresentative({ email: inviteEmail.trim() }));

    if (inviteCompanyRepresentative.fulfilled.match(result)) {
      toast.success(
        t('representativesManagement.inviteSentSuccess', {
          email: inviteEmail.trim(),
          defaultValue: `Invitation sent successfully to ${inviteEmail.trim()}.`,
        })
      );
      setInviteEmail('');
      setInviteEmailError(null);
    } else if (inviteCompanyRepresentative.rejected.match(result)) {
      const serverErrs = result.payload?.errors?.email;
      if (serverErrs && serverErrs.length > 0) {
        // Field validation error - displayed inline under input, do NOT toast
        setInviteEmailError(serverErrs[0]);
        return;
      }

      const rawMsg = result.payload?.message;
      const isTechnicalMailError =
        rawMsg &&
        (rawMsg.includes('stream_socket_client') ||
          rawMsg.includes('Connection could not be established') ||
          rawMsg.includes('smtp') ||
          rawMsg.includes('actively refused'));

      if (isTechnicalMailError) {
        const msg = t(
          'representativesManagement.mailSendError',
          'تعذّر إرسال البريد الإلكتروني. يُرجى التحقق من اتصال خادم البريد والمحاولة مرة أخرى.'
        );
        toast.error(msg);
      } else if (rawMsg) {
        toast.error(rawMsg);
      }
    }
  };

  const handleStartEdit = (rep: CompanyRepresentativeItem) => {
    setEditingRepId(rep.id);
    setEditingJobTitle(rep.job_title || '');
  };

  const handleCancelEdit = () => {
    setEditingRepId(null);
    setEditingJobTitle('');
  };

  const handleSaveEdit = async (rep: CompanyRepresentativeItem) => {
    const isSelf = rep.user_id === currentUserId;
    const newTitle = editingJobTitle.trim() || null;

    let result;
    if (isSelf) {
      result = await dispatch(updateCompanyRepresentativeMe({ job_title: newTitle }));
    } else {
      result = await dispatch(updateCompanyRepresentative({ id: rep.id, job_title: newTitle }));
    }

    if (
      updateCompanyRepresentativeMe.fulfilled.match(result) ||
      updateCompanyRepresentative.fulfilled.match(result)
    ) {
      toast.success(
        t('representativesManagement.updateSuccess', 'Job title updated successfully.')
      );
      setEditingRepId(null);
    } else {
      toast.error(t('common:toast.error', 'Failed to update job title.'));
    }
  };

  const handleOpenConfirm = (rep: CompanyRepresentativeItem, isLeave: boolean) => {
    setConfirmDialog({
      isOpen: true,
      rep,
      isLeave,
    });
  };

  const handleCloseConfirm = () => {
    setConfirmDialog({ isOpen: false, rep: null, isLeave: false });
  };

  const handleExecuteRemoval = async () => {
    if (!confirmDialog.rep) return;
    const { rep, isLeave } = confirmDialog;

    const result = await dispatch(removeCompanyRepresentative(rep.id));

    if (removeCompanyRepresentative.fulfilled.match(result)) {
      toast.success(
        isLeave
          ? t('representativesManagement.leaveSuccess', 'You have left the company successfully.')
          : t('representativesManagement.removeSuccess', 'Representative removed successfully.')
      );
      handleCloseConfirm();

      if (isLeave) {
        // Refresh profile state & redirect if user no longer has company rep access
        await dispatch(fetchProfile());
        navigate('/dashboard');
      } else {
        // Re-fetch representatives to ensure updated roles/primary flag
        dispatch(fetchCompanyRepresentatives());
      }
    } else {
      toast.error(t('common:toast.error', 'Failed to remove representative.'));
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return '??';
    return name
      .trim()
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '-';
    try {
      return new Date(isoString).toLocaleDateString(isArabic ? 'ar-YE' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Main Representatives List Card ─────────────────────────── */}
      <Card className="bg-surface border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-university-primary/10 text-university-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  {t('representativesManagement.title', 'Company Representatives')}
                  <Badge variant="secondary" className="text-xs px-2 py-0.5 font-normal">
                    {representatives.length}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-foreground-muted mt-0.5">
                  {t(
                    'representativesManagement.subtitle',
                    "Manage your company's team members, roles, and access."
                  )}
                </CardDescription>
              </div>
            </div>

            {isAdmin && (
              <Badge
                variant="outline"
                className="self-start sm:self-auto text-xs py-1 px-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 flex items-center gap-1.5 font-medium"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {t('representativesManagement.adminBadge', 'Primary Admin')}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'loading' && representatives.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-foreground-muted">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-xs">{t('common:loading', 'Loading representatives…')}</span>
            </div>
          ) : representatives.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-border rounded-xl">
              <Users className="h-10 w-10 mx-auto text-foreground-muted/50 mb-2" />
              <p className="text-xs text-foreground-muted font-medium">
                {t('representativesManagement.noRepresentatives', 'No representatives found.')}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {representatives.map((rep) => {
                const isSelf = rep.user_id === currentUserId;
                const isCurrentlyEditing = editingRepId === rep.id;
                const canEditThisRep = isSelf || isAdmin;
                const canRemoveThisRep = isSelf || isAdmin;

                return (
                  <div
                    key={rep.id}
                    className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors rounded-lg hover:bg-surface-secondary/40 p-2"
                  >
                    {/* Left: Avatar & Info */}
                    <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                      <Avatar className="h-11 w-11 shrink-0 border border-border">
                        {rep.avatar_url && (
                          <AvatarImage src={rep.avatar_url} alt={rep.name || ''} />
                        )}
                        <AvatarFallback className="text-xs font-bold bg-university-primary/10 text-university-primary">
                          {getInitials(rep.name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {rep.name || '—'}
                          </span>

                          {isSelf && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] py-0 px-1.5 font-normal bg-university-primary/10 text-university-primary border border-university-primary/20"
                            >
                              {t('representativesManagement.you', 'You')}
                            </Badge>
                          )}

                          {rep.is_primary ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] py-0 px-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 flex items-center gap-1"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              {t('representativesManagement.adminBadge', 'Primary Admin')}
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="text-[10px] py-0 px-2 text-foreground-muted"
                            >
                              {t('representativesManagement.repBadge', 'Representative')}
                            </Badge>
                          )}
                        </div>

                        {/* Contact details */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-foreground-muted">
                          <span className="flex items-center gap-1 font-mono">
                            <Mail className="w-3 h-3" />
                            {rep.email}
                          </span>
                          {rep.phone && (
                            <span className="flex items-center gap-1 font-mono" dir="ltr">
                              <Phone className="w-3 h-3" />
                              {rep.phone}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-[10px]">
                            <Calendar className="w-3 h-3" />
                            {t('representativesManagement.joinedOn', {
                              date: formatDate(rep.joined_at || rep.created_at),
                              defaultValue: `Joined ${formatDate(rep.joined_at || rep.created_at)}`,
                            })}
                          </span>
                        </div>

                        {/* Job Title / Inline Edit */}
                        <div className="pt-0.5">
                          {isCurrentlyEditing ? (
                            <div className="flex items-center gap-2 mt-1">
                              <Input
                                value={editingJobTitle}
                                onChange={(e) => setEditingJobTitle(e.target.value)}
                                placeholder={t(
                                  'representativesManagement.jobTitlePlaceholder',
                                  'e.g. HR Manager'
                                )}
                                className="text-xs h-7 max-w-xs"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleSaveEdit(rep)}
                                disabled={updateStatus === 'loading'}
                                className="h-7 px-2.5 text-xs cursor-pointer bg-university-primary hover:bg-university-secondary text-white"
                                aria-label={t('representativesManagement.save', 'Save')}
                              >
                                {updateStatus === 'loading' ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                                disabled={updateStatus === 'loading'}
                                className="h-7 px-2.5 text-xs cursor-pointer"
                                aria-label={t('representativesManagement.cancel', 'Cancel')}
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium text-foreground">
                                {rep.job_title ? (
                                  rep.job_title
                                ) : (
                                  <span className="text-foreground-muted italic text-[11px]">
                                    {t(
                                      'representativesManagement.jobTitlePlaceholder',
                                      'No title set'
                                    )}
                                  </span>
                                )}
                              </span>
                              {canEditThisRep && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(rep)}
                                  title={t(
                                    'representativesManagement.editJobTitle',
                                    'Edit Job Title'
                                  )}
                                  className="text-foreground-muted hover:text-university-primary p-1 rounded-md hover:bg-surface transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    {canRemoveThisRep && !isCurrentlyEditing && (
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        {isSelf
                          ? // Hide "Leave Company" if this user is the only representative
                            representatives.length > 1 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenConfirm(rep, true)}
                                className="text-xs h-8 px-3 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                              >
                                <LogOut className="w-3.5 h-3.5 ltr:mr-1.5 rtl:ml-1.5" />
                                {t('representativesManagement.leaveCompany', 'Leave Company')}
                              </Button>
                            )
                          : isAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenConfirm(rep, false)}
                                className="text-xs h-8 px-2.5 text-destructive/80 hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                title={t('representativesManagement.removeMember', 'Remove')}
                              >
                                <Trash2 className="w-3.5 h-3.5 ltr:mr-1.5 rtl:ml-1.5" />
                                {t('representativesManagement.removeMember', 'Remove')}
                              </Button>
                            )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Invite Colleague Form (Admin Only) ────────────────────────── */}
      {isAdmin && (
        <Card className="bg-surface border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-university-primary" />
              {t('representativesManagement.inviteTitle', 'Invite a Colleague')}
            </CardTitle>
            <CardDescription className="text-xs text-foreground-muted">
              {t(
                'representativesManagement.inviteSubtitle',
                'Send an invitation link for a new representative to join this company.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label htmlFor="colleague-email" className="sr-only">
                  {t('representativesManagement.emailLabel', 'Colleague Email Address')}
                </Label>
                <Input
                  id="colleague-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    if (inviteEmailError) setInviteEmailError(null);
                    if (validationErrors?.email) dispatch(clearRepresentativeErrors());
                  }}
                  placeholder={t(
                    'representativesManagement.emailPlaceholder',
                    'colleague@company.com'
                  )}
                  aria-invalid={!!(inviteEmailError || validationErrors?.email?.[0])}
                  className="text-xs h-9"
                />
                {(inviteEmailError || validationErrors?.email?.[0]) && (
                  <span className="text-[11px] text-destructive mt-1 block font-medium">
                    {inviteEmailError || validationErrors?.email?.[0]}
                  </span>
                )}
              </div>
              <Button
                type="submit"
                disabled={inviteStatus === 'loading' || !inviteEmail.trim()}
                className="text-xs h-9 px-5 shrink-0 cursor-pointer bg-university-primary hover:bg-university-secondary text-white disabled:cursor-not-allowed"
              >
                {inviteStatus === 'loading' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin ltr:mr-1.5 rtl:ml-1.5" />
                    {t('representativesManagement.sending', 'Sending…')}
                  </>
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5 ltr:mr-1.5 rtl:ml-1.5" />
                    {t('representativesManagement.sendInvite', 'Send Invite')}
                  </>
                )}
              </Button>
            </form>
            <p className="text-[11px] text-foreground-muted mt-2 italic">
              {t(
                'representativesManagement.inviteNote',
                'The invited colleague will receive a signed link to create their representative account.'
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Confirmation Modal (Leave / Remove) ────────────────────────── */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-surface border border-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-destructive/10 text-destructive shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">
                  {confirmDialog.isLeave
                    ? t('representativesManagement.leaveConfirmTitle', 'Leave Company?')
                    : t('representativesManagement.removeConfirmTitle', 'Remove Representative?')}
                </h3>
                <p className="text-xs text-foreground-muted leading-relaxed">
                  {confirmDialog.isLeave
                    ? t(
                        'representativesManagement.leaveConfirmDesc',
                        "Are you sure you want to leave this company? You will lose access to this company's account and training opportunities."
                      )
                    : t('representativesManagement.removeConfirmDesc', {
                        name: confirmDialog.rep?.name || 'this representative',
                        defaultValue: `Are you sure you want to remove ${confirmDialog.rep?.name || 'this representative'} from the company?`,
                      })}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseConfirm}
                disabled={removeStatus === 'loading'}
                className="text-xs h-9 px-4 cursor-pointer"
              >
                {t('representativesManagement.cancel', 'Cancel')}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleExecuteRemoval}
                disabled={removeStatus === 'loading'}
                className="text-xs h-9 px-4 cursor-pointer bg-destructive hover:bg-destructive/90 text-white disabled:cursor-not-allowed"
              >
                {removeStatus === 'loading' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin ltr:mr-1.5 rtl:ml-1.5" />
                    {t('representativesManagement.deleting', 'Processing…')}
                  </>
                ) : confirmDialog.isLeave ? (
                  t('representativesManagement.leaveConfirmButton', 'Yes, Leave Company')
                ) : (
                  t('representativesManagement.removeConfirmButton', 'Yes, Remove Member')
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyRepresentativesSection;
