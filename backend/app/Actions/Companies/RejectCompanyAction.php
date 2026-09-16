<?php

declare(strict_types=1);

namespace App\Actions\Companies;

use App\Exceptions\CompanyRejectionException;
use App\Mail\CompanyStatusUpdateMail;
use App\Models\AuditLog;
use App\Models\Company;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

class RejectCompanyAction
{
    /**
     * Reject or request changes on a pending or under-review company registration request.
     *
     * @param  Company  $company  The company to reject or request changes on.
     * @param  string  $targetStatus  The target status (''rejected'' or ''changes_requested'').
     * @param  string  $reason  The explanation / feedback provided by the coordinator.
     * @param  int|null  $actorId  Optional explicit actor ID (defaults to auth()->id()).
     * @return array{company: Company, mail_sent: bool} Updated company and mail delivery status.
     *
     * @throws CompanyRejectionException
     */
    public function execute(
        Company $company,
        string $targetStatus,
        string $reason,
        ?int $actorId = null
    ): array {
        // 1. Guard: status must be pending_verification or under_review
        if (! in_array($company->status, ['pending_verification', 'under_review'], true)) {
            throw CompanyRejectionException::invalidStatus((string) $company->status);
        }

        // 2. Guard: target status must be rejected or changes_requested
        if (! in_array($targetStatus, ['rejected', 'changes_requested'], true)) {
            throw CompanyRejectionException::invalidTargetStatus($targetStatus);
        }

        // 3. Guard: reason must not be empty
        $trimmedReason = trim($reason);
        if ($trimmedReason === '') {
            throw CompanyRejectionException::missingReason();
        }

        $actor = $actorId ?? Auth::id();
        $contactEmail = $company->contact_email ?? $company->email;
        if (empty($contactEmail)) {
            throw new CompanyRejectionException('Cannot reject or request changes on a company with no contact email.');
        }

        $registrationUrl = $targetStatus === 'changes_requested'
            ? rtrim(config('app.frontend_url'), '/').'/register-company'
            : null;

        try {
            Mail::to($contactEmail)->send(
                new CompanyStatusUpdateMail(
                    company: $company,
                    status: $targetStatus,
                    reason: $trimmedReason,
                    recipientName: null,
                    locale: 'ar',
                    registrationUrl: $registrationUrl,
                )
            );
        } catch (TransportExceptionInterface $e) {
            Log::warning('RejectCompanyAction: failed to send status update email', [
                'company_id' => $company->id,
                'email' => $contactEmail,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        } catch (\Throwable $e) {
            Log::warning('RejectCompanyAction: unexpected mail error', [
                'company_id' => $company->id,
                'email' => $contactEmail,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }

        // 4. Persist state changes and record the audit log inside a transaction.
        $freshCompany = DB::transaction(function () use ($company, $targetStatus, $trimmedReason, $actor) {
            $beforeState = [
                'status' => $company->status,
                'status_reason' => $company->status_reason,
            ];

            // Update company status and reason (do not touch approved_by / approved_at)
            $company->update([
                'status' => $targetStatus,
                'status_reason' => $trimmedReason,
            ]);

            $afterState = [
                'status' => $targetStatus,
                'status_reason' => $trimmedReason,
            ];

            // Record audit log
            AuditLog::create([
                'actor_id' => $actor,
                'action' => 'companies.reject',
                'entity_type' => 'companies',
                'entity_id' => $company->id,
                'before_state' => $beforeState,
                'after_state' => $afterState,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);

            return $company->fresh();
        });

        return ['company' => $freshCompany, 'mail_sent' => true];
    }
}
