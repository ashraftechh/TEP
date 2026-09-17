<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\Applications\RecordApplicationTransitionAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Applications\AcceptApplicationRequest;
use App\Http\Requests\Applications\ApplyToOpportunityRequest;
use App\Http\Requests\Applications\CompanyApplicationsRequest;
use App\Http\Requests\Applications\MyApplicationsRequest;
use App\Http\Requests\Applications\RejectApplicationRequest;
use App\Http\Requests\Applications\ReviewApplicationRequest;
use App\Http\Requests\Applications\ScheduleInterviewRequest;
use App\Http\Requests\Applications\ViewApplicationTransitionsRequest;
use App\Http\Requests\Applications\WithdrawApplicationRequest;
use App\Http\Resources\ApplicationResource;
use App\Http\Resources\ApplicationTransitionResource;
use App\Models\Application;
use App\Models\Opportunity;
use App\Models\User;
use App\Services\ApplicationEligibilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ApplicationController extends Controller
{
    public function __construct(
        private readonly ApplicationEligibilityService $eligibilityService,
        private readonly RecordApplicationTransitionAction $recordTransitionAction,
    ) {}

    /**
     * List the authenticated student's own applications.
     *
     * TEP-636 — GET /api/v1/my/applications
     *
     * Always scoped to the authenticated user's student_profile_id — never
     * accepts a student_profile_id query param (ownership is implicit from the
     * token, same pattern as ApplyToOpportunityRequest).
     *
     * Supports an optional `status` filter and standard pagination.
     * Eager-loads opportunity.company (to avoid N+1 on the list) and the
     * single latest transition (for the "last updated" summary line).
     */
    public function index(MyApplicationsRequest $request): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();

        // Ownership is implicit — never read student_profile_id from the request.
        $studentProfile = $user->studentProfile;

        $query = Application::with([
            'opportunity.company',
            'latestTransition.actor',
        ])
            ->where('student_profile_id', $studentProfile->id);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('opportunity_type_id') || $request->filled('q')) {
            $query->whereHas('opportunity', function ($opportunityQuery) use ($request) {
                if ($request->filled('opportunity_type_id')) {
                    $opportunityQuery->where('opportunity_type_id', $request->input('opportunity_type_id'));
                }

                if ($request->filled('q')) {
                    $searchTerm = '%'.strtolower($request->input('q')).'%';
                    $opportunityQuery->where(function ($q) use ($searchTerm) {
                        $q->whereRaw('LOWER(title->>"$.en") LIKE ?', [$searchTerm])
                            ->orWhereRaw('LOWER(title->>"$.ar") LIKE ?', [$searchTerm])
                            ->orWhereHas('company', function ($companyQuery) use ($searchTerm) {
                                $companyQuery->whereRaw('LOWER(name->>"$.en") LIKE ?', [$searchTerm])
                                    ->orWhereRaw('LOWER(name->>"$.ar") LIKE ?', [$searchTerm]);
                            });
                    });
                }
            });
        }

        $applications = $query
            ->orderByDesc('submitted_at')
            ->paginate((int) $request->input('per_page', 15));

        return ApplicationResource::collection($applications);
    }

    /**
     * Submit a student application for a training opportunity.
     *
     * Gated by the `applications.own.create` permission and validated by
     * `ApplicationEligibilityService` (fail-fast: published/deadline, capacity,
     * duplicate check, and concurrent active applications cap).
     */
    public function store(ApplyToOpportunityRequest $request, Opportunity $opportunity): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $studentProfile = $user->studentProfile;

        if (! $studentProfile) {
            return response()->json([
                'message' => __('profile.student_profile_not_found'),
            ], 404);
        }

        // 1. Run eligibility rules check (TEP-629)
        $eligibility = $this->eligibilityService->check($opportunity, $studentProfile);

        if (! $eligibility['eligible']) {
            return response()->json([
                'message' => $eligibility['reason'],
                'error_code' => $eligibility['error_code'],
            ], $eligibility['http_status']);
        }

        // 2. Create application or re-activate terminal application, and record transition
        $application = DB::transaction(function () use ($request, $opportunity, $studentProfile, $user): Application {
            // Check if there is an existing terminal application (withdrawn / rejected)
            $existingApp = Application::where('opportunity_id', $opportunity->id)
                ->where('student_profile_id', $studentProfile->id)
                ->whereIn('status', Application::REAPPLYABLE_STATUSES)
                ->first();

            if ($existingApp) {
                $previousStatus = $existingApp->status;
                $existingApp->update([
                    'cv_file_id' => $request->integer('cv_file_id'),
                    'cover_note' => $request->filled('cover_note') ? (string) $request->input('cover_note') : null,
                    'decision_reason' => null,
                    'withdrawn_reason' => null,
                    'interview_at' => null,
                    'submitted_at' => now(),
                ]);

                return $this->recordTransitionAction->execute(
                    application: $existingApp,
                    toStatus: 'submitted',
                    actor: $user,
                    reason: null,
                    fromStatus: $previousStatus
                );
            }

            $newApplication = Application::create([
                'opportunity_id' => $opportunity->id,
                'student_profile_id' => $studentProfile->id,
                'cv_file_id' => $request->integer('cv_file_id'),
                'cover_note' => $request->filled('cover_note') ? (string) $request->input('cover_note') : null,
                'status' => 'submitted',
                'version' => 0,
                'submitted_at' => now(),
            ]);

            // Record initial transition (from_status = null, to_status = 'submitted')
            return $this->recordTransitionAction->execute(
                application: $newApplication,
                toStatus: 'submitted',
                actor: $user,
                reason: null,
                fromStatus: null,
                isInitial: true
            );
        });

        $application->load([
            'opportunity.company',
            'studentProfile.user',
            'studentProfile.major',
            'studentProfile.skills',
            'studentProfile.avatarFile',
            'cvFile',
            'transitions.actor',
        ]);

        return (new ApplicationResource($application))
            ->additional([
                'message' => __('applications.submitted_successfully', [
                    'default' => 'Your application has been submitted successfully.',
                ]),
            ])
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Withdraw the authenticated student's own application.
     *
     * TEP-640 — POST /api/v1/applications/{application}/withdraw
     * Permission `applications.own.withdraw` + ownership, both enforced in
     * WithdrawApplicationRequest::authorize() (403 if not the owning student).
     *
     * A student may only withdraw while the application's current status is
     * one of config('applications.withdrawable_statuses') (TEP-628) — an
     * accepted / rejected / already-withdrawn application cannot be withdrawn
     * again (409).
     *
     * Every status write goes through RecordApplicationTransitionAction, which
     * both updates applications.status and appends an application_transitions
     * row in the same DB transaction — never updated directly here.
     */
    public function withdraw(WithdrawApplicationRequest $request, Application $application): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! in_array($application->status, config('applications.withdrawable_statuses', []), true)) {
            return response()->json([
                'message' => __('applications.cannot_withdraw', [
                    'default' => 'This application cannot be withdrawn from its current status.',
                ]),
                'error_code' => 'cannot_withdraw',
            ], 409);
        }

        $reason = $request->filled('reason') ? (string) $request->input('reason') : null;

        // Flagged cleanup — not explicitly requested by TEP-640, noted here
        // rather than done silently: clear a stale interview_at so a withdrawn
        // application doesn't keep showing a scheduled interview time. Setting
        // it as a dirty attribute here means RecordApplicationTransitionAction's
        // single ->save() call persists it together with the status change, in
        // the same DB transaction — no extra write.
        if ($application->status === 'interview_scheduled') {
            $application->interview_at = null;
        }

        $application = $this->recordTransitionAction->execute(
            application: $application,
            toStatus: 'withdrawn',
            actor: $user,
            reason: $reason,
        );

        $application->load([
            'opportunity.company',
            'studentProfile.user',
            'studentProfile.major',
            'studentProfile.skills',
            'studentProfile.avatarFile',
            'cvFile',
            'transitions.actor',
        ]);

        return (new ApplicationResource($application))
            ->additional([
                'message' => __('applications.withdrawn_successfully', [
                    'default' => 'Your application has been withdrawn.',
                ]),
            ])
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Accept a student's application to the acting representative's own
     * company's opportunity.
     *
     * TEP-648 — POST /api/v1/applications/{application}/accept
     * Permission `applications.company.review` + ownership, both enforced in
     * AcceptApplicationRequest::authorize() — same shared permission as
     * reject (TEP-649) and interview scheduling (TEP-653), mirroring Sprint
     * 2's precedent of one permission covering multiple related company
     * decisions.
     *
     * Allowed only from submitted / under_review / interview_scheduled
     * (422 otherwise). Rejected with 409 if the opportunity has already
     * reached its capacity — a company cannot accept beyond the stated
     * capacity, and the current count/capacity are surfaced in the error so
     * the UI can explain it clearly (and disable the button pre-emptively).
     *
     * The capacity check and the accepted_count increment happen inside the
     * same DB::transaction() as the status transition, with the opportunity
     * row locked via lockForUpdate() — this is what actually prevents two
     * concurrent accepts from both slipping through at the capacity
     * boundary, not just an application-layer check performed in isolation.
     *
     * accepted_count is incremented ONLY here — never recomputed from a live
     * COUNT query elsewhere (per the schema note on opportunities.accepted_count).
     *
     * Explicitly out of scope, flagged, not built: accepting an application
     * does NOT create a `training_assignments` row. That table doesn't exist
     * yet (PROJECT_STATE.md lists it as "not yet built", without an
     * associated ticket in this sprint's board) — turning an acceptance into
     * an actual training assignment is a real, necessary next step for a
     * future sprint and should be raised, not silently invented here.
     */
    public function accept(AcceptApplicationRequest $request, Application $application): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! in_array($application->status, Application::ACTIVE_STATUSES, true)) {
            return response()->json([
                'message' => __('applications.cannot_accept', [
                    'default' => 'This application cannot be accepted from its current status.',
                ]),
                'error_code' => 'cannot_accept',
            ], 422);
        }

        $outcome = DB::transaction(function () use ($application, $user) {
            /** @var Opportunity $opportunity */
            $opportunity = Opportunity::whereKey($application->opportunity_id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($opportunity->accepted_count >= $opportunity->capacity) {
                return ['capacity_exceeded' => true, 'opportunity' => $opportunity];
            }

            $updatedApplication = $this->recordTransitionAction->execute(
                application: $application,
                toStatus: 'accepted',
                actor: $user,
            );

            $opportunity->increment('accepted_count');

            return ['application' => $updatedApplication];
        });

        if (! empty($outcome['capacity_exceeded'])) {
            /** @var Opportunity $opportunity */
            $opportunity = $outcome['opportunity'];

            return response()->json([
                'message' => __('applications.capacity_reached', [
                    'default' => 'This opportunity has already reached its accepted-student capacity.',
                ]),
                'error_code' => 'capacity_reached',
                'accepted_count' => $opportunity->accepted_count,
                'capacity' => $opportunity->capacity,
            ], 409);
        }

        /** @var Application $updatedApplication */
        $updatedApplication = $outcome['application'];
        $updatedApplication->load([
            'opportunity.company',
            'studentProfile.user',
            'studentProfile.major',
            'studentProfile.skills',
            'studentProfile.avatarFile',
            'cvFile',
            'transitions.actor',
        ]);

        return (new ApplicationResource($updatedApplication))
            ->additional([
                'message' => __('applications.decision_recorded', [
                    'default' => 'Decision recorded successfully.',
                ]),
            ])
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Reject a student's application to the acting representative's own
     * company's opportunity.
     *
     * TEP-649 — POST /api/v1/applications/{application}/reject
     * Same permission and ownership pattern as accept() (TEP-648).
     *
     * Unlike withdrawal, a rejection reason is REQUIRED (validated in
     * RejectApplicationRequest) — the company owes the student a concrete
     * explanation. Allowed only from submitted / under_review /
     * interview_scheduled (422 otherwise — cannot reject an already
     * accepted or withdrawn application). Rejecting never touches
     * opportunities.accepted_count.
     */
    public function reject(RejectApplicationRequest $request, Application $application): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! in_array($application->status, Application::ACTIVE_STATUSES, true)) {
            return response()->json([
                'message' => __('applications.cannot_reject', [
                    'default' => 'This application cannot be rejected from its current status.',
                ]),
                'error_code' => 'cannot_reject',
            ], 422);
        }

        $reason = (string) $request->input('reason');

        $application = $this->recordTransitionAction->execute(
            application: $application,
            toStatus: 'rejected',
            actor: $user,
            reason: $reason,
        );

        $application->load([
            'opportunity.company',
            'studentProfile.user',
            'studentProfile.major',
            'studentProfile.skills',
            'studentProfile.avatarFile',
            'cvFile',
            'transitions.actor',
        ]);

        return (new ApplicationResource($application))
            ->additional([
                'message' => __('applications.decision_recorded', [
                    'default' => 'Decision recorded successfully.',
                ]),
            ])
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Schedule (or reschedule) an interview for a student's application to
     * the acting representative's own company's opportunity.
     *
     * TEP-653 — POST /api/v1/applications/{application}/interview
     * Same permission + ownership gate as accept()/reject() (TEP-648/649):
     * `applications.company.review`, enforced in
     * ScheduleInterviewRequest::authorize() — there is no dedicated
     * `applications.schedule_interview` permission (flagged as an inference
     * in ScheduleInterviewRequest, not a literal ticket-to-permission match).
     *
     * Allowed only from submitted / under_review (422 otherwise) — an
     * already-decided or withdrawn application cannot have an interview
     * scheduled against it.
     *
     * Re-scheduling (calling this again while already interview_scheduled)
     * is explicitly allowed: it updates interview_at in place and does NOT
     * go through RecordApplicationTransitionAction, since to_status would be
     * unchanged from the current status — only a genuine status change is
     * logged as a transition (FLAGGED as a judgment call: the ticket did not
     * fully specify this case, but logging a same-status "transition" would
     * misrepresent the append-only history as a status change that never
     * happened). The first schedule (from submitted/under_review) DOES go
     * through RecordApplicationTransitionAction, mirroring withdraw()'s
     * pattern of setting interview_at as a dirty attribute before calling
     * the action so it persists in the same ->save() call / DB transaction
     * as the status write — no extra query.
     */
    public function scheduleInterview(ScheduleInterviewRequest $request, Application $application): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $interviewAt = Carbon::parse((string) $request->input('interview_at'))->setTimezone((string) config('app.timezone'));

        if ($application->status === 'interview_scheduled') {
            // Reschedule: update the time only, no new transition row.
            $application->update(['interview_at' => $interviewAt]);
        } elseif (in_array($application->status, ['submitted', 'under_review'], true)) {
            // First schedule: set interview_at as a dirty attribute, then let
            // RecordApplicationTransitionAction's single ->save() persist it
            // together with the status change, in the same DB transaction.
            $application->interview_at = $interviewAt;

            $application = $this->recordTransitionAction->execute(
                application: $application,
                toStatus: 'interview_scheduled',
                actor: $user,
            );
        } else {
            return response()->json([
                'message' => __('applications.cannot_schedule_interview', [
                    'default' => 'This application cannot have an interview scheduled from its current status.',
                ]),
                'error_code' => 'cannot_schedule_interview',
            ], 422);
        }

        $application->load([
            'opportunity.company',
            'studentProfile.user',
            'studentProfile.major',
            'studentProfile.skills',
            'studentProfile.avatarFile',
            'cvFile',
            'transitions.actor',
        ]);

        return (new ApplicationResource($application))
            ->additional([
                'message' => __('applications.interview_scheduled_successfully', [
                    'default' => 'Interview scheduled successfully.',
                ]),
            ])
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Mark a student's application as under review by the acting representative's company.
     *
     * TEP-652 — POST /api/v1/applications/{application}/review
     * Permission `applications.company.review` + ownership, enforced in
     * ReviewApplicationRequest::authorize().
     *
     * Allowed only from `submitted` status (422 otherwise).
     */
    public function review(ReviewApplicationRequest $request, Application $application): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($application->status !== 'submitted') {
            return response()->json([
                'message' => __('applications.cannot_review', [
                    'default' => 'This application cannot be put under review from its current status.',
                ]),
                'error_code' => 'cannot_review',
            ], 422);
        }

        $application = $this->recordTransitionAction->execute(
            application: $application,
            toStatus: 'under_review',
            actor: $user,
        );

        $application->load([
            'opportunity.company',
            'studentProfile.user',
            'studentProfile.major',
            'studentProfile.skills',
            'studentProfile.avatarFile',
            'cvFile',
            'transitions.actor',
        ]);

        return (new ApplicationResource($application))
            ->additional([
                'message' => __('applications.review_started_successfully', [
                    'default' => 'Application is now under review.',
                ]),
            ])
            ->response()
            ->setStatusCode(200);
    }

    /**
     * List applications submitted to the acting representative's own company.
     *
     * TEP-644 — GET /api/v1/company/applications
     * Permission `applications.company.view`, scoped to opportunities owned
     * by the acting representative's company only — never another
     * company's applications (same scoping pattern as OpportunityController
     * ::index()'s company_representative branch).
     *
     * Filters: `opportunity_id`, `status`. Sortable by `created_at`
     * (newest/oldest, default) and by `status`. Eager-loads studentProfile
     * (+ user + major, for name/major/GPA), opportunity (title), and cvFile
     * (so the reviewer can open the CV directly from the list).
     */
    public function companyIndex(CompanyApplicationsRequest $request): AnonymousResourceCollection|JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $company = $user->companyRepresentative?->company;

        if (! $company) {
            // Defensive fallback — CompanyApplicationsRequest::authorize() already
            // rejects users without a companyRepresentative record, so this
            // should be unreachable in practice.
            return response()->json([
                'message' => __('applications.company_not_found', [
                    'default' => 'No company is associated with your account.',
                ]),
            ], 404);
        }

        $query = Application::with([
            'studentProfile.user',
            'studentProfile.major',
            'studentProfile.skills',
            'studentProfile.avatarFile',
            'opportunity',
            'cvFile',
        ])
            // Ownership scoping: only applications whose opportunity belongs
            // to the acting representative's own company — never another
            // company's, and never computed from a request-supplied id.
            ->whereHas('opportunity', function ($opportunityQuery) use ($company) {
                $opportunityQuery->where('company_id', $company->id);
            });

        if ($request->filled('opportunity_id')) {
            $query->where('opportunity_id', $request->integer('opportunity_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $sortBy = $request->input('sort_by', 'submitted_at');
        $sortDir = $request->input('sort_dir', 'desc');
        $query->orderBy($sortBy, $sortDir);

        $applications = $query->paginate((int) $request->input('per_page', 15));

        return ApplicationResource::collection($applications);
    }

    /**
     * Return the full, ordered status transition history for an application.
     *
     * TEP-657 — GET /api/v1/applications/{application}/transitions
     * Permission: the requester must either own the application
     * (`applications.own.view`) or own the opportunity's company
     * (`applications.company.view`) — enforced entirely in
     * ViewApplicationTransitionsRequest::authorize(), same division of
     * responsibility as withdraw()/accept()/reject() above. An unrelated
     * student or company cannot view another application's history (403).
     *
     * Distinct from `audit_logs` (see the comment on the ApplicationTransition
     * model): this is domain-specific application status history, always
     * scoped to one application, never the system-wide sensitive action log.
     *
     * Returns transitions in chronological order (oldest first — the
     * `transitions()` relation on Application already applies
     * ->orderBy('created_at')), each with the actor's name + role(s) so the
     * requester can tell whether a change was their own action or the other
     * party's.
     */
    public function transitions(ViewApplicationTransitionsRequest $request, Application $application): AnonymousResourceCollection
    {
        $application->load(['transitions.actor.userRoles.role']);

        return ApplicationTransitionResource::collection($application->transitions)
            ->additional([
                'message' => __('applications.transitions_fetched', [
                    'default' => 'Application history retrieved successfully.',
                ]),
            ]);
    }
}
