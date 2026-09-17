<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'application_id',
    'student_profile_id',
    'company_id',
    'opportunity_id',
    'academic_supervisor_id',
    'field_supervisor_id',
    'training_coordinator_id',
    'status',
    'start_date',
    'end_date',
    'progress_percentage',
    'required_reports_count',
    'report_configuration',
    'suspension_reason',
    'termination_reason',
    'version',
])]
class TrainingAssignment extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * Per the original migration comment, the workflow used to start at
     * `pending_assignment`. As of the 2026-09-10 product decision, a
     * newly-created assignment is `active` immediately — there is no
     * longer a "created but not started" holding state (see
     * database/migrations/2026_09_10_..._remove_pending_assignment_status_from_training_assignments_table.php).
     *
     * @var list<string>
     */
    public const STATUSES = ['active', 'suspended', 'completed', 'terminated'];

    /**
     * TEP-669 — centralized, named training-status transition map (same
     * role as Sprint 3's opportunity status machine in
     * OpportunityController::transition(), but kept as a single reusable
     * constant here rather than duplicated inline) consumed by BOTH
     * TransitionTrainingAssignmentAction (TEP-670, the actual guard) and
     * TrainingAssignmentsTable's row actions (TEP-671, purely to decide
     * which actions to *show* — never re-implemented as a second list).
     *
     * There is no `pending_assignment` key (or status) anymore — every
     * assignment is created directly as `active`
     * (CreateTrainingAssignmentAction) since the 2026-09-10 product
     * decision above.
     *
     * `completed` is expected, as a future enhancement, to eventually be
     * reached automatically once `progress_percentage` hits 100 AND the
     * final report is approved (see TEP-682's progress-recalculation
     * note) — but per TEP-669's explicit instruction, that automatic
     * transition is NOT built in this sprint. For now `completed` is only
     * reachable via the coordinator's manual transition below, exactly
     * like `suspended` and `terminated`. Do not build the automatic
     * version without it being asked for.
     *
     * @var array<string, list<string>>
     */
    public const TRANSITIONS = [
        'active' => ['suspended', 'completed', 'terminated'],
        'suspended' => ['active', 'terminated'],
        'completed' => [],
        'terminated' => [],
    ];

    /**
     * Whether a transition from this assignment's current status to
     * `$to` is valid per TRANSITIONS. Single source of truth reused by
     * TransitionTrainingAssignmentAction (to guard the write) and by the
     * Filament table (to decide row-action visibility) — see the
     * TRANSITIONS docblock above.
     */
    public function canTransitionTo(string $to): bool
    {
        return in_array($to, self::TRANSITIONS[$this->status] ?? [], true);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'progress_percentage' => 'integer',
            'required_reports_count' => 'integer',
            'report_configuration' => 'array',
            'version' => 'integer',
        ];
    }

    /**
     * Determine if a given report type code is enabled for this assignment.
     */
    public function isReportTypeEnabled(string $typeCode): bool
    {
        if (empty($this->report_configuration)) {
            return true;
        }

        $config = $this->report_configuration[$typeCode] ?? null;
        if ($config === null) {
            return true;
        }

        return (bool) ($config['enabled'] ?? true);
    }

    /**
     * Get the maximum allowed report count for a given report type code.
     */
    public function getReportTypeMaxCount(string $typeCode): ?int
    {
        if (empty($this->report_configuration)) {
            return $typeCode === 'final' ? 1 : null;
        }

        $config = $this->report_configuration[$typeCode] ?? null;
        if ($config === null || ! isset($config['max_count'])) {
            return $typeCode === 'final' ? 1 : null;
        }

        return (int) $config['max_count'];
    }

    /**
     * Recurring report types in ascending granularity order. `final` is
     * deliberately excluded — it is always the last tier and is resolved
     * separately in getPrerequisiteReportType() since it has no "count"
     * of its own to sit at a position in this list.
     *
     * @var list<string>
     */
    public const REPORT_TYPE_HIERARCHY = ['daily', 'weekly', 'monthly'];

    /**
     * The nearest enabled tier below $typeCode in the reporting hierarchy,
     * or null if $typeCode has no enabled tier below it (nothing to
     * require first). Disabled tiers are skipped rather than breaking the
     * chain — e.g. if `daily` is off, `weekly`'s prerequisite is null, and
     * `monthly`'s prerequisite is `weekly` (or `daily` if `weekly` is also
     * off).
     *
     * `final` resolves to the nearest enabled recurring tier of any kind
     * (checked from most granular to least), since it sits after all of
     * them rather than at a fixed position in REPORT_TYPE_HIERARCHY.
     */
    public function getPrerequisiteReportType(string $typeCode): ?string
    {
        if ($typeCode === 'final') {
            foreach (array_reverse(self::REPORT_TYPE_HIERARCHY) as $candidate) {
                if ($this->isReportTypeEnabled($candidate) && $this->getReportTypeMaxCount($candidate)) {
                    return $candidate;
                }
            }

            return null;
        }

        $index = array_search($typeCode, self::REPORT_TYPE_HIERARCHY, true);
        if ($index === false || $index === 0) {
            return null;
        }

        for ($i = $index - 1; $i >= 0; $i--) {
            $candidate = self::REPORT_TYPE_HIERARCHY[$i];
            if ($this->isReportTypeEnabled($candidate) && $this->getReportTypeMaxCount($candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    /**
     * How many approved reports of $typeCode's prerequisite type must
     * exist before report #$reportNumber of $typeCode may be created or
     * submitted. Returns null when $typeCode has no enabled prerequisite
     * tier (nothing to gate on) or either side's quota isn't configured.
     *
     * Distributes the prerequisite type's total max count across this
     * type's slots as evenly as possible — NTILE-style, earliest slots
     * absorb the remainder — so an uneven ratio (e.g. 12 daily reports
     * over 5 weekly reports) never produces an impossible or lopsided
     * per-slot requirement. The cumulative total across all of this
     * type's slots always sums to exactly the prerequisite's max count,
     * which is what lets this same method also gate `final` (a single
     * slot requiring the prerequisite's full count) without special-casing
     * it separately.
     */
    public function getSequentialThreshold(string $typeCode, int $reportNumber): ?int
    {
        $prereqType = $this->getPrerequisiteReportType($typeCode);
        if ($prereqType === null) {
            return null;
        }

        $lowerMax = $this->getReportTypeMaxCount($prereqType);
        $higherMax = $typeCode === 'final' ? 1 : $this->getReportTypeMaxCount($typeCode);

        if (! $lowerMax || ! $higherMax) {
            return null;
        }

        $base = intdiv($lowerMax, $higherMax);
        $remainder = $lowerMax % $higherMax;

        $cumulative = 0;
        for ($i = 1; $i <= min($reportNumber, $higherMax); $i++) {
            $cumulative += $base + ($i <= $remainder ? 1 : 0);
        }

        return $cumulative;
    }

    /**
     * The application this assignment formalises.
     *
     * @return BelongsTo<Application, $this>
     */
    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    /**
     * The student profile of the trainee on this assignment.
     *
     * @return BelongsTo<StudentProfile, $this>
     */
    public function studentProfile(): BelongsTo
    {
        return $this->belongsTo(StudentProfile::class);
    }

    /**
     * The company hosting this training placement (denormalized directly
     * onto this table, not derived through application->opportunity, per
     * the real migration).
     *
     * @return BelongsTo<Company, $this>
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * The opportunity this assignment fulfils (denormalized directly onto
     * this table, per the real migration).
     *
     * @return BelongsTo<Opportunity, $this>
     */
    public function opportunity(): BelongsTo
    {
        return $this->belongsTo(Opportunity::class);
    }

    /**
     * The academic supervisor (a user holding the academic_supervisor role)
     * assigned to this training placement.
     *
     * @return BelongsTo<User, $this>
     */
    public function academicSupervisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'academic_supervisor_id');
    }

    /**
     * The company-side field supervisor (a user representing the company
     * the opportunity belongs to) assigned to this training placement.
     *
     * @return BelongsTo<User, $this>
     */
    public function fieldSupervisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'field_supervisor_id');
    }

    /**
     * The training coordinator who created/owns this assignment
     * administratively.
     *
     * @return BelongsTo<User, $this>
     */
    public function trainingCoordinator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'training_coordinator_id');
    }

    /**
     * The reports (any status) filed against this training placement.
     *
     * TEP-665 — used via withCount() to compute `reports_submitted_count`
     * (anything past 'draft'); the reports workflow itself is a later ticket.
     *
     * @return HasMany<Report, $this>
     */
    public function reports(): HasMany
    {
        return $this->hasMany(Report::class);
    }

    /**
     * The attendance records logged against this training placement.
     *
     * TEP-665 — used via a correlated subquery to surface
     * `latest_attendance_status`; the record/approve workflow itself is a
     * later ticket.
     *
     * @return HasMany<AttendanceRecord, $this>
     */
    public function attendanceRecords(): HasMany
    {
        return $this->hasMany(AttendanceRecord::class);
    }
}