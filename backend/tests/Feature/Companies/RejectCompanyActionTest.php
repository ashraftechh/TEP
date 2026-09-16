<?php

declare(strict_types=1);

namespace Tests\Feature\Companies;

use App\Actions\Companies\RejectCompanyAction;
use App\Exceptions\CompanyRejectionException;
use App\Mail\CompanyStatusUpdateMail;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class RejectCompanyActionTest extends TestCase
{
    use RefreshDatabase;

    public function test_successfully_rejects_company_with_reason(): void
    {
        Mail::fake();

        $coordinator = User::factory()->create();
        $this->actingAs($coordinator);

        $company = Company::factory()->create([
            'contact_email' => 'partner@company.org',
            'status' => 'pending_verification',
            'approved_by' => null,
            'approved_at' => null,
            'status_reason' => null,
        ]);

        $action = app(RejectCompanyAction::class);
        $result = $action->execute(
            $company,
            'rejected',
            'Company activity does not align with university training programs.'
        );
        $updatedCompany = $result['company'];

        // Assert company status and reason updated
        $this->assertSame('rejected', $updatedCompany->status);
        $this->assertTrue($result['mail_sent']);
        $this->assertSame('Company activity does not align with university training programs.', $updatedCompany->status_reason);
        $this->assertNull($updatedCompany->approved_by);
        $this->assertNull($updatedCompany->approved_at);

        $this->assertDatabaseHas('companies', [
            'id' => $company->id,
            'status' => 'rejected',
            'status_reason' => 'Company activity does not align with university training programs.',
            'approved_by' => null,
            'approved_at' => null,
        ]);

        // Assert notification email sent with reason
        Mail::assertSent(CompanyStatusUpdateMail::class, function (CompanyStatusUpdateMail $mail) use ($company) {
            $this->assertTrue($mail->hasTo('partner@company.org'));
            $this->assertSame('rejected', $mail->status);
            $this->assertSame('Company activity does not align with university training programs.', $mail->reason);
            $this->assertSame($company->id, $mail->company->id);

            return true;
        });

        // Assert audit log created
        $this->assertDatabaseHas('audit_logs', [
            'actor_id' => $coordinator->id,
            'action' => 'companies.reject',
            'entity_type' => 'companies',
            'entity_id' => $company->id,
        ]);

        $auditLog = AuditLog::where('entity_id', $company->id)->first();
        $this->assertNotNull($auditLog);
        $this->assertSame('pending_verification', $auditLog->before_state['status']);
        $this->assertSame('rejected', $auditLog->after_state['status']);
        $this->assertSame('Company activity does not align with university training programs.', $auditLog->after_state['status_reason']);
    }

    public function test_successfully_requests_changes_on_company_with_reason(): void
    {
        Mail::fake();

        $coordinator = User::factory()->create();

        $company = Company::factory()->create([
            'contact_email' => 'changes@company.org',
            'status' => 'under_review',
            'approved_by' => null,
            'approved_at' => null,
            'status_reason' => null,
        ]);

        $action = app(RejectCompanyAction::class);
        $result = $action->execute(
            $company,
            'changes_requested',
            'Please update the commercial registration number with the official Ministry of Industry document.',
            $coordinator->id
        );
        $updatedCompany = $result['company'];

        $this->assertSame('changes_requested', $updatedCompany->status);
        $this->assertTrue($result['mail_sent']);
        $this->assertSame(
            'Please update the commercial registration number with the official Ministry of Industry document.',
            $updatedCompany->status_reason
        );
        $this->assertNull($updatedCompany->approved_by);
        $this->assertNull($updatedCompany->approved_at);

        Mail::assertSent(CompanyStatusUpdateMail::class, function (CompanyStatusUpdateMail $mail) {
            $this->assertSame('changes_requested', $mail->status);
            $this->assertStringContainsString('commercial registration number', $mail->reason);

            return true;
        });

        $auditLog = AuditLog::where('entity_id', $company->id)->first();
        $this->assertNotNull($auditLog);
        $this->assertSame('under_review', $auditLog->before_state['status']);
        $this->assertSame('changes_requested', $auditLog->after_state['status']);
    }

    public function test_cannot_reject_or_request_changes_on_already_terminal_status(): void
    {
        Mail::fake();

        $invalidStatuses = ['approved', 'rejected', 'changes_requested', 'suspended'];
        $action = app(RejectCompanyAction::class);

        foreach ($invalidStatuses as $invalidStatus) {
            $company = Company::factory()->create([
                'contact_email' => "terminal-{$invalidStatus}@company.org",
                'status' => $invalidStatus,
            ]);

            try {
                $action->execute($company, 'rejected', 'Reason for rejection');
                $this->fail("Expected CompanyRejectionException was not thrown for status: {$invalidStatus}");
            } catch (CompanyRejectionException $e) {
                $this->assertStringContainsString($invalidStatus, $e->getMessage());
            }

            // Assert database status was not changed
            $this->assertDatabaseHas('companies', [
                'id' => $company->id,
                'status' => $invalidStatus,
            ]);
        }

        Mail::assertNothingSent();
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_cannot_reject_with_invalid_target_status(): void
    {
        Mail::fake();

        $company = Company::factory()->create([
            'status' => 'pending_verification',
        ]);

        $action = app(RejectCompanyAction::class);

        $this->expectException(CompanyRejectionException::class);
        $this->expectExceptionMessage('Invalid target status "suspended"');

        $action->execute($company, 'suspended', 'Reason for rejection');
    }

    public function test_cannot_reject_with_empty_reason(): void
    {
        Mail::fake();

        $company = Company::factory()->create([
            'status' => 'pending_verification',
        ]);

        $action = app(RejectCompanyAction::class);

        $this->expectException(CompanyRejectionException::class);
        $this->expectExceptionMessage('A reason must be provided');

        $action->execute($company, 'rejected', '   ');
    }
}
