<?php

declare(strict_types=1);

namespace App\Actions\Reports;

use App\Actions\Reports\Concerns\ReportPlacementValidator;
use App\Exceptions\NoActiveTrainingAssignmentException;
use App\Models\File;
use App\Models\Report;
use App\Models\ReportType;
use App\Models\TrainingAssignment;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * TEP-674 — Create a report draft for the authenticated student's active
 * training assignment.
 *
 * Mirrors RecordAttendanceAction's shape: resolve the owning assignment,
 * then run the duplicate check + insert inside a single DB transaction
 * with `lockForUpdate()` to prevent a race between two concurrent
 * requests creating the same (assignment, type, number) report twice.
 * No DB-level unique constraint backs this alone (see the new
 * add_unique_constraint_to_reports_table migration for the DB-level
 * backstop) — this transaction-level check is the primary guard.
 *
 * The actual placement checks (type-enabled, sequence threshold, quota,
 * duplicate) live in ReportPlacementValidator, shared with
 * UpdateReportAction so a PATCH that changes report_type_id/report_number
 * is held to the exact same rules as creation.
 */
class CreateReportAction
{
    private readonly ReportPlacementValidator $placementValidator;

    public function __construct()
    {
        $this->placementValidator = new ReportPlacementValidator;
    }

    /**
     * @param array{
     *     report_type_id: int,
     *     title: string,
     *     report_number: int,
     *     content: string,
     *     due_at?: string|null,
     *     file_ids?: list<int>|null,
     * } $data
     */
    public function execute(User $actor, array $data): Report
    {
        $studentProfile = $actor->studentProfile;

        if ($studentProfile === null) {
            throw NoActiveTrainingAssignmentException::forStudent($actor->id);
        }

        $assignment = TrainingAssignment::query()
            ->where('student_profile_id', $studentProfile->id)
            ->where('status', 'active')
            ->first();

        if ($assignment === null) {
            throw NoActiveTrainingAssignmentException::forStudent($actor->id);
        }

        return DB::transaction(function () use ($assignment, $data) {
            $reportTypeId = (int) $data['report_type_id'];
            $reportNumber = (int) $data['report_number'];

            // Normalise report_number for final reports — always 1 — before
            // validating, same as the pre-extraction inline logic did.
            $reportTypeCode = ReportType::find($reportTypeId)?->code;
            if ($reportTypeCode === 'final') {
                $reportNumber = 1;
                $data['report_number'] = 1;
            }

            $this->placementValidator->validate($assignment, $reportTypeId, $reportNumber);

            $report = Report::create([
                'training_assignment_id' => $assignment->id,
                'title' => $data['title'],
                'report_type_id' => $data['report_type_id'],
                'report_number' => $data['report_number'],
                'content' => $data['content'],
                'status' => 'draft',
                'grade' => null,
                // TEP-674 explicitly specifies version = 0 at creation for
                // reports — a deliberate divergence from the version = 1
                // convention used at creation by other Sprint-3/4 entities
                // (Application, TrainingAssignment, AttendanceRecord).
                // Kept exactly as specified rather than "corrected" to
                // match those, per the ticket's own wording.
                'version' => 0,
                'submitted_at' => null,
                'due_at' => $data['due_at'] ?? null,
            ]);

            // Attach any pre-uploaded files by pointing their polymorphic
            // fileable columns at the newly created report.
            if (! empty($data['file_ids'])) {
                File::query()
                    ->whereIn('id', $data['file_ids'])
                    ->update([
                        'fileable_type' => Report::class,
                        'fileable_id' => $report->id,
                        'purpose' => 'report_attachment',
                    ]);
            }

            return $report;
        });
    }
}
