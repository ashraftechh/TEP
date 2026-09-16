<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\Reports\CreateReportAction;
use App\Actions\Reports\ReviewReportAction;
use App\Actions\Reports\SubmitReportAction;
use App\Actions\Reports\UpdateReportAction;
use App\Exceptions\DuplicateReportException;
use App\Exceptions\NoActiveTrainingAssignmentException;
use App\Exceptions\ReportNotEditableException;
use App\Exceptions\ReportNotReviewableException;
use App\Exceptions\ReportNotSubmittableException;
use App\Exceptions\ReportQuotaExceededException;
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
     */
    public function index(ListReportsRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->hasPermission('reports.review') && ! $user->hasRole('student')) {
            $query = Report::query()
                ->whereIn('status', Report::SUBMITTED_STATUSES)
                ->whereHas('trainingAssignment', function ($q) use ($user) {
                    $q->where('academic_supervisor_id', $user->id);
                });
        } elseif ($user->studentProfile !== null) {
            $assignmentIds = TrainingAssignment::query()
                ->where('student_profile_id', $user->studentProfile->id)
                ->pluck('id');

            $query = Report::query()->whereIn('training_assignment_id', $assignmentIds);
        } elseif ($user->hasPermission('training_assignments.view_any')) {
            $query = Report::query();
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

        $reports = $query
            ->with([
                'reportType',
                'files',
                'latestReview',
                'trainingAssignment.studentProfile.user',
                'trainingAssignment.opportunity',
                'trainingAssignment.company',
            ])
            ->orderBy('id', 'desc')
            ->get();

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
