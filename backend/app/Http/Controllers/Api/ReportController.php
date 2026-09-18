<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\Reports\CreateReportAction;
use App\Actions\Reports\ReviewReportAction;
use App\Actions\Reports\SubmitReportAction;
use App\Actions\Reports\UpdateReportAction;
use App\Exceptions\AssignmentNotActiveException;
use App\Exceptions\DuplicateReportException;
use App\Exceptions\NoActiveTrainingAssignmentException;
use App\Exceptions\ReportNotEditableException;
use App\Exceptions\ReportNotReviewableException;
use App\Exceptions\ReportNotSubmittableException;
use App\Exceptions\ReportQuotaExceededException;
use App\Exceptions\ReportSequenceNotMetException;
use App\Exceptions\ReportTypeNotAllowedException;
use App\Exceptions\TrainingCompletedException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Reports\CreateReportRequest;
use App\Http\Requests\Reports\ListReportsRequest;
use App\Http\Requests\Reports\ReviewReportRequest;
use App\Http\Requests\Reports\SubmitReportRequest;
use App\Http\Requests\Reports\UpdateReportRequest;
use App\Http\Requests\Reports\ViewReportReviewsRequest;
use App\Http\Resources\ReportResource;
use App\Http\Resources\ReportReviewResource;
use App\Models\Report;
use App\Models\ReportType;
use App\Models\TrainingAssignment;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class ReportController extends Controller
{
    public function __construct(
        private readonly CreateReportAction $createReportAction,
        private readonly UpdateReportAction $updateReportAction,
        private readonly SubmitReportAction $submitReportAction,
        private readonly ReviewReportAction $reviewReportAction,
    ) {}

    /**
     * List reports for the authenticated student or assigned academic supervisor.
     *
     * TEP-674/TEP-682/Sprint 4 — GET /api/v1/reports
     *
     * Default scoping: both the student branch and the academic-supervisor
     * branch default to reports belonging to each relevant assignment's
     * CURRENT one (`training_assignments.is_current = true`) — a student
     * or supervisor otherwise viewing a mix of an old, already-finished
     * placement's reports alongside a new one's is confusing and, for
     * quota/sequence purposes on the student side, actively incorrect.
     * An explicit `training_assignment_id` overrides this to look at one
     * specific assignment (current or historical) directly; for the
     * supervisor branch only, `include_history=1` instead drops the
     * is_current restriction entirely to browse everything.
     */
    public function index(ListReportsRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $explicitAssignmentId = $request->filled('training_assignment_id')
            ? (int) $request->input('training_assignment_id')
            : null;
        $includeHistory = $request->boolean('include_history');

        if ($user->hasPermission('reports.review') && ! $user->hasRole('student')) {
            $query = Report::query()
                ->whereIn('status', Report::SUBMITTED_STATUSES)
                ->whereHas('trainingAssignment', function ($q) use ($user, $explicitAssignmentId, $includeHistory) {
                    $q->where('academic_supervisor_id', $user->id);

                    if ($explicitAssignmentId !== null) {
                        $q->where('id', $explicitAssignmentId);
                    } elseif (! $includeHistory) {
                        $q->where('is_current', true);
                    }
                });
        } elseif ($user->studentProfile !== null) {
            $assignmentIds = TrainingAssignment::query()
                ->where('student_profile_id', $user->studentProfile->id)
                ->when(
                    $explicitAssignmentId !== null,
                    fn ($q) => $q->where('id', $explicitAssignmentId),
                    fn ($q) => $q->where('is_current', true)
                )
                ->pluck('id');

            $query = Report::query()->whereIn('training_assignment_id', $assignmentIds);
        } elseif ($user->hasPermission('training_assignments.view_any')) {
            $query = Report::query();

            if ($explicitAssignmentId !== null) {
                $query->where('training_assignment_id', $explicitAssignmentId);
            }
        } else {
            return ReportResource::collection(collect())->response();
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('report_type_id')) {
            $query->where('report_type_id', (int) $request->input('report_type_id'));
        }

        if ($request->filled('student_id')) {
            $query->whereHas('trainingAssignment', function ($q) use ($request) {
                $q->where('student_profile_id', (int) $request->input('student_id'));
            });
        }

        if ($request->filled('company_id')) {
            $query->whereHas('trainingAssignment', function ($q) use ($request) {
                $q->where('company_id', (int) $request->input('company_id'));
            });
        }

        if ($request->filled('opportunity_id')) {
            $query->whereHas('trainingAssignment', function ($q) use ($request) {
                $q->where('opportunity_id', (int) $request->input('opportunity_id'));
            });
        }

        if ($request->filled('q')) {
            $search = (string) $request->input('q');
            $query->where(function ($sub) use ($search) {
                $sub->where('title', 'like', "%{$search}%")
                    ->orWhereHas('trainingAssignment.studentProfile', function ($sp) use ($search) {
                        $sp->where('student_number', 'like', "%{$search}%")
                            ->orWhereHas('user', function ($u) use ($search) {
                                $u->where('name', 'like', "%{$search}%");
                            });
                    })
                    ->orWhereHas('trainingAssignment.opportunity', function ($opp) use ($search) {
                        $opp->where('title', 'like', "%{$search}%");
                    })
                    ->orWhereHas('trainingAssignment.company', function ($comp) use ($search) {
                        $comp->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $query->with([
            'reportType',
            'files',
            'latestReview',
            'trainingAssignment.studentProfile.user',
            'trainingAssignment.opportunity',
            'trainingAssignment.company',
        ]);

        // For the reviewer queue specifically, order so reports surface in
        // sequence order rather than raw insertion recency — otherwise a
        // supervisor could see report #3 of a type above report #1 simply
        // because it was submitted more recently.
        if ($user->hasPermission('reports.review') && ! $user->hasRole('student')) {
            $reports = $query
                ->orderBy('training_assignment_id')
                ->orderBy('report_type_id')
                ->orderBy('report_number')
                ->orderByRaw('due_at IS NULL')
                ->orderBy('due_at')
                ->orderBy('id')
                ->get();
        } else {
            $reports = $query->orderBy('id', 'desc')->get();
        }

        return ReportResource::collection($reports)->response();
    }

    /**
     * Create a report draft for the authenticated student's active
     * training assignment.
     *
     * TEP-674 — POST /api/v1/reports
     */
    public function store(CreateReportRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        try {
            $report = $this->createReportAction->execute($user, $request->validated());
        } catch (TrainingCompletedException) {
            return response()->json([
                'message' => __('reports.training_completed'),
                'error_code' => 'training_completed',
            ], 422);
        } catch (NoActiveTrainingAssignmentException) {
            return response()->json([
                'message' => __('reports.no_active_assignment'),
                'error_code' => 'no_active_assignment',
            ], 422);
        } catch (ReportTypeNotAllowedException) {
            return response()->json([
                'message' => __('reports.report_type_not_allowed'),
                'error_code' => 'report_type_not_allowed',
            ], 422);
        } catch (ReportQuotaExceededException) {
            return response()->json([
                'message' => __('reports.report_quota_exceeded'),
                'error_code' => 'report_quota_exceeded',
            ], 422);
        } catch (ReportSequenceNotMetException $e) {
            return response()->json([
                'message' => __('reports.report_sequence_not_met', [
                    'prerequisite_type' => ReportType::where('code', $e->prerequisiteType)->first()?->name ?? $e->prerequisiteType,
                    'type' => ReportType::where('code', $e->typeCode)->first()?->name ?? $e->typeCode,
                ]),
                'error_code' => 'report_sequence_not_met',
                'meta' => [
                    'prerequisite_type' => $e->prerequisiteType,
                    'required' => $e->required,
                    'approved' => $e->approved,
                ],
            ], 422);
        } catch (DuplicateReportException $e) {
            $isFinal = $e->errorCode === 'duplicate_final_report';

            return response()->json([
                'message' => $isFinal ? __('reports.duplicate_final_report') : __('reports.duplicate_report'),
                'error_code' => $e->errorCode,
            ], 409);
        }

        $report->load(['reportType', 'files', 'latestReview']);

        return (new ReportResource($report))
            ->additional([
                'message' => __('reports.created_successfully'),
            ])
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Update a report draft or revision-requested report.
     *
     * TEP-674 — PATCH /api/v1/reports/{report}
     */
    public function update(UpdateReportRequest $request, Report $report): JsonResponse
    {
        try {
            $report = $this->updateReportAction->execute($report, $request->validated());
        } catch (ReportNotEditableException) {
            return response()->json([
                'message' => __('reports.not_editable'),
                'error_code' => 'report_not_editable',
            ], 422);
        } catch (AssignmentNotActiveException $e) {
            return response()->json([
                'message' => __('reports.assignment_not_active', ['status' => $e->status]),
                'error_code' => 'assignment_not_active',
            ], 422);
        } catch (TrainingCompletedException) {
            return response()->json([
                'message' => __('reports.training_completed'),
                'error_code' => 'training_completed',
            ], 422);
        } catch (ReportTypeNotAllowedException) {
            return response()->json([
                'message' => __('reports.report_type_not_allowed'),
                'error_code' => 'report_type_not_allowed',
            ], 422);
        } catch (ReportQuotaExceededException) {
            return response()->json([
                'message' => __('reports.report_quota_exceeded'),
                'error_code' => 'report_quota_exceeded',
            ], 422);
        } catch (ReportSequenceNotMetException $e) {
            return response()->json([
                'message' => __('reports.report_sequence_not_met', [
                    'prerequisite_type' => ReportType::where('code', $e->prerequisiteType)->first()?->name ?? $e->prerequisiteType,
                    'type' => ReportType::where('code', $e->typeCode)->first()?->name ?? $e->typeCode,
                ]),
                'error_code' => 'report_sequence_not_met',
                'meta' => [
                    'prerequisite_type' => $e->prerequisiteType,
                    'required' => $e->required,
                    'approved' => $e->approved,
                ],
            ], 422);
        } catch (DuplicateReportException $e) {
            $isFinal = $e->errorCode === 'duplicate_final_report';

            return response()->json([
                'message' => $isFinal ? __('reports.duplicate_final_report') : __('reports.duplicate_report'),
                'error_code' => $e->errorCode,
            ], 409);
        }

        $report->load(['reportType', 'files', 'latestReview']);

        return (new ReportResource($report))
            ->additional([
                'message' => __('reports.updated_successfully'),
            ])
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Submit a report draft or resubmit a revision-requested report.
     *
     * TEP-678 — POST /api/v1/reports/{report}/submit
     */
    public function submit(SubmitReportRequest $request, Report $report): JsonResponse
    {
        try {
            $report = $this->submitReportAction->execute($report);
        } catch (TrainingCompletedException) {
            return response()->json([
                'message' => __('reports.training_completed'),
                'error_code' => 'training_completed',
            ], 422);
        } catch (AssignmentNotActiveException $e) {
            return response()->json([
                'message' => __('reports.assignment_not_active', ['status' => $e->status]),
                'error_code' => 'assignment_not_active',
            ], 422);
        } catch (ReportSequenceNotMetException $e) {
            return response()->json([
                'message' => __('reports.report_sequence_not_met_same_type', [
                    'number' => $e->reportNumber,
                    'previous' => ((int) $e->reportNumber) - 1,
                    'type' => ReportType::where('code', $e->typeCode)->first()?->name ?? $e->typeCode,
                ]),
                'error_code' => 'report_sequence_not_met_same_type',
                'meta' => [
                    'report_type_id' => $e->reportTypeId,
                    'report_number' => $e->reportNumber,
                ],
            ], 422);
        } catch (ReportNotSubmittableException) {
            return response()->json([
                'message' => __('reports.not_submittable'),
                'error_code' => 'report_not_submittable',
            ], 422);
        }

        $report->load(['reportType', 'files', 'latestReview']);

        return (new ReportResource($report))
            ->additional([
                'message' => __('reports.submitted_successfully'),
            ])
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Review a submitted report (approve, reject, or request revision).
     *
     * TEP-682 — POST /api/v1/reports/{report}/review
     */
    public function review(ReviewReportRequest $request, Report $report): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        try {
            $report = $this->reviewReportAction->execute($report, $user, $request->validated());
        } catch (ReportNotReviewableException) {
            return response()->json([
                'message' => __('reports.not_reviewable'),
                'error_code' => 'report_not_reviewable',
            ], 422);
        }

        $report->load(['reportType', 'files', 'latestReview', 'trainingAssignment.studentProfile.user']);

        return (new ReportResource($report))
            ->additional([
                'message' => __('reports.reviewed_successfully'),
            ])
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Get review history for a report.
     *
     * TEP-682 — GET /api/v1/reports/{report}/reviews
     */
    public function reviews(ViewReportReviewsRequest $request, Report $report): JsonResponse
    {
        $reviews = $report->reviews()
            ->with('reviewer')
            ->orderBy('id', 'desc')
            ->get();

        return ReportReviewResource::collection($reviews)->response();
    }
}
