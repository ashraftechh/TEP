<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\TrainingAssignments\CreateTrainingAssignmentAction;
use App\Actions\TrainingAssignments\TransitionTrainingAssignmentAction;
use App\Exceptions\DuplicateTrainingAssignmentException;
use App\Exceptions\InvalidTrainingAssignmentTransitionException;
use App\Exceptions\StudentAlreadyAssignedException;
use App\Http\Controllers\Controller;
use App\Http\Requests\TrainingAssignments\CreateTrainingAssignmentRequest;
use App\Http\Requests\TrainingAssignments\ListTrainingAssignmentsRequest;
use App\Http\Requests\TrainingAssignments\MyTrainingAssignmentRequest;
use App\Http\Requests\TrainingAssignments\TransitionTrainingAssignmentRequest;
use App\Http\Resources\TrainingAssignmentResource;
use App\Models\Application;
use App\Models\AttendanceRecord;
use App\Models\Report;
use App\Models\TrainingAssignment;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TrainingAssignmentController extends Controller
{
    public function __construct(
        private readonly CreateTrainingAssignmentAction $createTrainingAssignmentAction,
        private readonly TransitionTrainingAssignmentAction $transitionTrainingAssignmentAction,
    ) {}

    /**
     * Formalise an accepted application into a training assignment.
     *
     * TEP-661 — POST /api/v1/training-assignments
     * Permission `training_assignments.create` (training_coordinator only),
     * enforced by route middleware — see routes/api.php.
     *
     * Allowed only when the target application's status is `accepted`
     * (422 otherwise) — a coordinator can only formalise a placement the
     * company has already accepted, never a submitted/rejected/withdrawn
     * application. Rejected with 409 if a training_assignments row already
     * exists for this application (one assignment per accepted application,
     * not re-creatable) — that check, plus the actual row creation, happens
     * inside CreateTrainingAssignmentAction's DB::transaction() so a race
     * between two concurrent requests for the same application can't create
     * two rows (the table also carries a DB-level unique constraint on
     * application_id as a second line of defence).
     */
    public function store(CreateTrainingAssignmentRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validated();

        /** @var Application $application */
        $application = Application::with('opportunity')->findOrFail($validated['application_id']);

        // Check if a training assignment already exists for this application.
        $assignmentExistsForApplication = TrainingAssignment::where('application_id', $application->id)->exists();

        if ($assignmentExistsForApplication) {
            return response()->json([
                'message' => __('training_assignments.already_exists'),
                'error_code' => 'training_assignment_already_exists',
            ], 409);
        }

        // Check if the student already holds an active or suspended assignment.
        $hasActiveAssignment = TrainingAssignment::where('student_profile_id', $application->student_profile_id)
            ->whereIn('status', ['active', 'suspended'])
            ->exists();

        if ($hasActiveAssignment) {
            return response()->json([
                'message' => __('training_assignments.student_already_assigned'),
                'error_code' => 'student_already_has_active_assignment',
            ], 409);
        }

        // 1. Only an accepted application can be formalised into an assignment.
        if ($application->status !== 'accepted') {
            return response()->json([
                'message' => __('training_assignments.cannot_create_from_status'),
                'error_code' => 'cannot_create_assignment',
            ], 422);
        }

        try {
            $assignment = $this->createTrainingAssignmentAction->execute(
                application: $application,
                data: [
                    'academic_supervisor_id' => isset($validated['academic_supervisor_id']) ? (int) $validated['academic_supervisor_id'] : null,
                    'field_supervisor_id' => isset($validated['field_supervisor_id']) ? (int) $validated['field_supervisor_id'] : null,
                    'start_date' => isset($validated['start_date']) ? (string) $validated['start_date'] : null,
                    'end_date' => isset($validated['end_date']) ? (string) $validated['end_date'] : null,
                    'required_reports_count' => isset($validated['required_reports_count']) ? (int) $validated['required_reports_count'] : null,
                    'report_configuration' => $validated['report_configuration'] ?? null,
                ],
                coordinator: $user,
            );
        } catch (DuplicateTrainingAssignmentException $e) {
            return response()->json([
                'message' => __('training_assignments.already_exists'),
                'error_code' => 'training_assignment_already_exists',
            ], 409);
        } catch (StudentAlreadyAssignedException $e) {
            return response()->json([
                'message' => __('training_assignments.student_already_assigned'),
                'error_code' => 'student_already_has_active_assignment',
            ], 409);
        }

        $assignment->load([
            'application.opportunity.company',
            'studentProfile.user',
            'company',
            'opportunity',
            'academicSupervisor',
            'fieldSupervisor',
            'trainingCoordinator',
        ]);

        return (new TrainingAssignmentResource($assignment))
            ->additional([
                'message' => __('training_assignments.created_successfully'),
            ])
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Transition a training assignment's status.
     *
     * TEP-670 — POST /api/v1/training-assignments/{assignment}/transition
     * Permission `training_assignments.transition` (training_coordinator
     * only), enforced by route middleware — see routes/api.php. No
     * per-row ownership check: any coordinator may transition any
     * assignment, same as store().
     *
     * The requested `to` status is validated against TEP-669's transition
     * map inside TransitionTrainingAssignmentAction — an invalid pair for
     * the assignment's current status returns 422 with error_code
     * `invalid_transition`, distinct from a 422 raised by request
     * validation itself (e.g. a missing `reason` when required).
     *
     * This endpoint exists for API completeness / potential future React
     * consumption per TEP-670's own note ("called both from the API...
     * and from the Filament resource") — today the only built caller is
     * TEP-671's Filament row actions, since there is no React screen for
     * this coordinator-only permission (see TEP-668's project context).
     */
    public function transition(TransitionTrainingAssignmentRequest $request, TrainingAssignment $trainingAssignment): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validated();

        try {
            $assignment = $this->transitionTrainingAssignmentAction->execute(
                assignment: $trainingAssignment,
                to: (string) $validated['to'],
                reason: isset($validated['reason']) ? (string) $validated['reason'] : null,
                actor: $user,
            );
        } catch (InvalidTrainingAssignmentTransitionException $e) {
            return response()->json([
                'message' => __('training_assignments.invalid_transition', [
                    'from' => $trainingAssignment->status,
                    'to' => $validated['to'],
                ]),
                'error_code' => 'invalid_transition',
                'allowed_transitions' => TrainingAssignment::TRANSITIONS[$trainingAssignment->status] ?? [],
            ], 422);
        }

        $assignment->load([
            'application.opportunity.company',
            'studentProfile.user',
            'company',
            'opportunity',
            'academicSupervisor',
            'fieldSupervisor',
            'trainingCoordinator',
        ]);

        return (new TrainingAssignmentResource($assignment))
            ->additional([
                'message' => __('training_assignments.transitioned_successfully'),
            ])
            ->response()
            ->setStatusCode(200);
    }

    /**
     * List training assignments visible to the acting user's role.
     *
     * TEP-665 — GET /api/v1/training-assignments
     * Permission `training_assignments.own.view` OR `training_assignments
     * .view_any` (checked in ListTrainingAssignmentsRequest::authorize());
     * WHICH rows are visible is then scoped here by role, same
     * division of responsibility as OpportunityController::index()'s
     * multi-role branching (TEP-620):
     *  - company_representative: assignments whose (denormalized)
     *    company_id matches their own company.
     *  - academic_supervisor: assignments where they are the assigned
     *    academic_supervisor.
     *  - student: their own single assignment (at most one row — a
     *    dedicated single-record fetch also exists, see
     *    myTrainingAssignment() below).
     *  - training_coordinator / super_admin: everything.
     *
     * A user matching none of the above (permission granted in principle
     * but no matching role — not expected given the permission catalog's
     * 1:1 role mapping) gets an empty result set, never an unscoped list —
     * same fail-safe pattern as OpportunityController::index().
     *
     * Filters: `status`, `q` (student name search). Paginated.
     */
    public function index(ListTrainingAssignmentsRequest $request): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();

        $query = $this->scopedQuery($user);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('q')) {
            $searchTerm = '%'.mb_strtolower((string) $request->input('q')).'%';
            $query->where(function ($q) use ($searchTerm) {
                $q->whereHas('studentProfile', function ($profileQuery) use ($searchTerm) {
                    $profileQuery->where('student_number', 'LIKE', $searchTerm)
                        ->orWhereHas('user', function ($userQuery) use ($searchTerm) {
                            $userQuery->whereRaw('LOWER(name) LIKE ?', [$searchTerm]);
                        })
                        ->orWhereHas('major', function ($majorQuery) use ($searchTerm) {
                            $majorQuery->whereRaw('LOWER(name->>"$.ar") LIKE ?', [$searchTerm])
                                ->orWhereRaw('LOWER(name->>"$.en") LIKE ?', [$searchTerm])
                                ->orWhere('code', 'LIKE', $searchTerm);
                        });
                })
                    ->orWhereHas('opportunity', function ($oppQuery) use ($searchTerm) {
                        $oppQuery->whereRaw('LOWER(title->>"$.ar") LIKE ?', [$searchTerm])
                            ->orWhereRaw('LOWER(title->>"$.en") LIKE ?', [$searchTerm]);
                    })
                    ->orWhereHas('company', function ($companyQuery) use ($searchTerm) {
                        $companyQuery->whereRaw('LOWER(name->>"$.ar") LIKE ?', [$searchTerm])
                            ->orWhereRaw('LOWER(name->>"$.en") LIKE ?', [$searchTerm]);
                    });
            });
        }

        $assignments = $query
            ->orderByDesc('created_at')
            ->paginate((int) $request->input('per_page', 15));

        return TrainingAssignmentResource::collection($assignments);
    }

    /**
     * Fetch the authenticated student's own single training assignment.
     *
     * TEP-665 — GET /api/v1/my/training-assignment
     * Permission `training_assignments.own.view` + a student profile,
     * enforced in MyTrainingAssignmentRequest::authorize(). Returns 404
     * (not an empty 200) when the student has no assignment yet — there is
     * nothing to render, and the frontend distinguishes "not started yet"
     * from a real error using the `error_code`.
     */
    public function myTrainingAssignment(MyTrainingAssignmentRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $studentProfile = $user->studentProfile;

        $assignment = $this->baseQuery()
            ->where('student_profile_id', $studentProfile->id)
            ->first();

        if (! $assignment) {
            return response()->json([
                'message' => __('training_assignments.no_active_assignment'),
                'error_code' => 'no_active_assignment',
            ], 404);
        }

        return (new TrainingAssignmentResource($assignment))
            ->additional([
                'message' => __('training_assignments.fetched_successfully'),
            ])
            ->response()
            ->setStatusCode(200);
    }

    /**
     * The base eager-loaded + aggregated query shared by index() and
     * myTrainingAssignment() — same underlying data shape for both, per
     * TEP-666's Redux slice note ("all three read from the same TEP-665
     * endpoint/response shapes").
     *
     * `reports_submitted_count` / `latest_attendance_status` are computed
     * via query aggregation (withCount + a correlated subquery), never a
     * per-row loop — this is exactly the N+1-by-another-name the project's
     * existing conventions warn against (see TEP-665's ticket note).
     */
    private function baseQuery(): Builder
    {
        return TrainingAssignment::query()
            ->select('training_assignments.*')
            ->with([
                'application.opportunity.company.logoFile',
                'application.opportunity.company.industry',
                'studentProfile.user',
                'studentProfile.major',
                'studentProfile.avatarFile',
                'company.logoFile',
                'company.industry',
                'opportunity',
                'academicSupervisor',
                'fieldSupervisor',
            ])
            ->withCount([
                'reports as reports_submitted_count' => function ($reportsQuery) {
                    $reportsQuery->whereIn('status', Report::SUBMITTED_STATUSES);
                },
            ])
            ->addSelect([
                // select('training_assignments.*') above is required: Eloquent's
                // addSelect() replaces the implicit "select *" with only the
                // columns explicitly listed, so without it this correlated
                // subquery would silently become the ONLY column selected.
                'latest_attendance_status' => AttendanceRecord::query()
                    ->select('status')
                    ->whereColumn('training_assignment_id', 'training_assignments.id')
                    ->orderByDesc('attendance_date')
                    ->limit(1),
            ]);
    }

    /**
     * Apply role-based visibility scoping on top of baseQuery().
     */
    private function scopedQuery(User $user): Builder
    {
        $query = $this->baseQuery();

        if ($user->hasRole('training_coordinator') || $user->hasRole('super_admin')) {
            return $query;
        }

        if ($user->hasRole('company_representative')) {
            $company = $user->companyRepresentative?->company;

            if (! $company) {
                return $query->whereRaw('1 = 0');
            }

            return $query->where('company_id', $company->id);
        }

        if ($user->hasRole('academic_supervisor')) {
            return $query->where('academic_supervisor_id', $user->id);
        }

        if ($user->hasRole('student')) {
            $studentProfile = $user->studentProfile;

            if (! $studentProfile) {
                return $query->whereRaw('1 = 0');
            }

            return $query->where('student_profile_id', $studentProfile->id);
        }

        // No matching role for a permission that, per the seeded catalog,
        // should always come with one of the roles above — fail closed.
        return $query->whereRaw('1 = 0');
    }
}
