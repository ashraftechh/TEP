<?php

declare(strict_types=1);

namespace App\Actions\Reports;

use App\Actions\Reports\Concerns\ReportPlacementValidator;
use App\Exceptions\AssignmentNotActiveException;
use App\Exceptions\ReportNotEditableException;
use App\Models\File;
use App\Models\Report;
use App\Models\ReportType;
use Illuminate\Support\Facades\DB;

/**
 * TEP-674 — Update a report draft (PATCH /api/v1/reports/{report}).
 *
 * Allowed while the report's status is 'draft', 'revision_requested', or
 * 'rejected' — a rejected report is edited and resubmitted in place, the
 * same flow as revision_requested, rather than requiring a brand-new
 * report to be created. Re-checked inside the transaction under
 * `lockForUpdate()` to guard against a concurrent submit/review action
 * changing the status between the initial check and the write.
 *
 * If `report_type_id` and/or `report_number` are part of the patch, the
 * same ReportPlacementValidator that CreateReportAction runs is re-run
 * against the new pair (excluding this report's own row from the
 * duplicate check) — even when the submitted value is unchanged from
 * what's already stored, since the assignment's report_configuration
 * can be edited after the report was created, and a type/number that
 * was valid at creation time may no longer be (e.g. its type has since
 * been disabled). Without this, a student could edit a legitimately-
 * created draft into a type/number combination that would never have
 * been allowed at creation time (wrong type not enabled, sequence not
 * met, quota exceeded, or a duplicate of another report), since editing
 * content/title alone previously skipped all of CreateReportAction's
 * checks entirely.
 *
 * Also blocked, for ANY field, once the report's training assignment is
 * no longer 'active' (suspended/terminated/completed) — a draft left
 * over from before the assignment ended shouldn't be editable, the same
 * reasoning that blocks new report creation for a non-active assignment.
 */
class UpdateReportAction
{
    /**
     * @param array{
     *     report_type_id?: int,
     *     title?: string,
     *     report_number?: int,
     *     content?: string,
     *     due_at?: string|null,
     *     file_ids?: list<int>|null,
     * } $data
     */
    public const EDITABLE_STATUSES = ['draft', 'revision_requested', 'rejected'];

    private readonly ReportPlacementValidator $placementValidator;

    public function __construct()
    {
        $this->placementValidator = new ReportPlacementValidator;
    }

    public function execute(Report $report, array $data): Report
    {
        if (! in_array($report->status, self::EDITABLE_STATUSES, true)) {
            throw ReportNotEditableException::forStatus($report->status);
        }

        return DB::transaction(function () use ($report, $data) {
            /** @var Report $locked */
            $locked = Report::query()->whereKey($report->id)->lockForUpdate()->firstOrFail();

            if (! in_array($locked->status, self::EDITABLE_STATUSES, true)) {
                throw ReportNotEditableException::forStatus($locked->status);
            }

            $assignment = $locked->trainingAssignment;

            if ($assignment === null || $assignment->status !== 'active') {
                throw AssignmentNotActiveException::forAssignment(
                    $assignment?->id,
                    $assignment?->status ?? 'unknown',
                );
            }

            $newReportTypeId = array_key_exists('report_type_id', $data)
                ? (int) $data['report_type_id']
                : (int) $locked->report_type_id;

            $newReportNumber = array_key_exists('report_number', $data)
                ? (int) $data['report_number']
                : (int) $locked->report_number;

            // Normalise report_number for final reports — always 1 — same
            // as CreateReportAction does before validating.
            $newReportTypeCode = ReportType::find($newReportTypeId)?->code;
            if ($newReportTypeCode === 'final') {
                $newReportNumber = 1;
                if (array_key_exists('report_number', $data)) {
                    $data['report_number'] = 1;
                }
            }

            $typeOrNumberChanged = array_key_exists('report_type_id', $data)
                || array_key_exists('report_number', $data);

            if ($typeOrNumberChanged) {
                $this->placementValidator->validate(
                    $assignment,
                    $newReportTypeId,
                    $newReportNumber,
                    ignoreReportId: $locked->id,
                );
            }

            $locked->fill(array_intersect_key($data, array_flip([
                'report_type_id', 'title', 'report_number', 'content', 'due_at',
            ])));

            // Optimistic-concurrency counter, incremented on every write —
            // same convention as TrainingAssignment/AttendanceRecord's
            // transition/approve/reject actions.
            $locked->version = (int) $locked->version + 1;
            $locked->save();

            // Sync attachments when file_ids is explicitly provided:
            // detach all existing files for this report, then attach the new set.
            if (array_key_exists('file_ids', $data)) {
                // Detach previously linked files (reset their polymorphic pointer)
                File::query()
                    ->where('fileable_type', Report::class)
                    ->where('fileable_id', $locked->id)
                    ->update(['fileable_type' => null, 'fileable_id' => null]);

                // Attach the new set
                if (! empty($data['file_ids'])) {
                    File::query()
                        ->whereIn('id', $data['file_ids'])
                        ->update([
                            'fileable_type' => Report::class,
                            'fileable_id' => $locked->id,
                            'purpose' => 'report_attachment',
                        ]);
                }
            }

            return $locked->refresh();
        });
    }
}
