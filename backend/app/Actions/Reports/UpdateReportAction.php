<?php

declare(strict_types=1);

namespace App\Actions\Reports;

use App\Exceptions\ReportNotEditableException;
use App\Models\File;
use App\Models\Report;
use Illuminate\Support\Facades\DB;

/**
 * TEP-674 — Update a report draft (PATCH /api/v1/reports/{report}).
 *
 * Allowed only while the report's status is still 'draft'; re-checked
 * inside the transaction under `lockForUpdate()` to guard against a
 * concurrent submit/review action changing the status between the
 * initial check and the write.
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
    public const EDITABLE_STATUSES = ['draft', 'revision_requested'];

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
