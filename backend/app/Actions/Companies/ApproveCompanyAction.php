<?php

declare(strict_types=1);

namespace App\Actions\Companies;

use App\Exceptions\CompanyApprovalException;
use App\Mail\CompanyJoinInviteMail;
use App\Models\AuditLog;
use App\Models\Company;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

class ApproveCompanyAction
{
    /**
     * Create a new action instance.
     */
    public function __construct(
        private readonly GenerateCompanyJoinInvite $generateCompanyJoinInvite,
    ) {}

    /**
     * Approve a pending or under_review company registration request.
     *
     * @param  Company  $company  The company to approve.
     * @param  int|null  $approverId  Optional explicit approver user ID (defaults to auth()->id()).
     * @return array{company: Company, mail_sent: bool} Updated company and mail delivery status.
     *
     * @throws CompanyApprovalException
     */
    public function execute(Company $company, ?int $approverId = null): array
    {
        // 1. Guard: status must be pending_verification or under_review
        if (! in_array($company->status, ['pending_verification', 'under_review'], true)) {
            throw CompanyApprovalException::invalidStatus((string) $company->status);
        }

        $email = $company->contact_email ?? $company->email;

        // 2. Guard: company contact email must not be null
        if (empty($email)) {
            throw CompanyApprovalException::missingEmail();
        }

        $actorId = $approverId ?? Auth::id();

        // 3. Generate the invite URL before sending the email.
        $inviteUrl = $this->generateCompanyJoinInvite->execute($company, (string) $email);

        try {
            Mail::to($email)->send(
                new CompanyJoinInviteMail(
                    company: $company,
                    inviteUrl: $inviteUrl,
                    recipientName: null,
                    locale: 'ar',
                )
            );
        } catch (TransportExceptionInterface $e) {
            Log::warning('ApproveCompanyAction: failed to send invite email', [
                'company_id' => $company->id,
                'email' => $email,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        } catch (\Throwable $e) {
            Log::warning('ApproveCompanyAction: unexpected mail error', [
                'company_id' => $company->id,
                'email' => $email,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }

        // 4. Persist state changes and record the audit log inside a transaction.
        $freshCompany = DB::transaction(function () use ($company, $actorId) {
            $beforeState = [
                'status' => $company->status,
                'approved_by' => $company->approved_by,
                'approved_at' => $company->approved_at?->toISOString(),
            ];

            $approvedAt = now();

            // Update company status and approval metadata
            $company->update([
                'status' => 'approved',
                'approved_by' => $actorId,
                'approved_at' => $approvedAt,
            ]);

            $afterState = [
                'status' => 'approved',
                'approved_by' => $actorId,
                'approved_at' => $approvedAt->toISOString(),
            ];

            // Record audit log
            AuditLog::create([
                'actor_id' => $actorId,
                'action' => 'companies.approve',
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
