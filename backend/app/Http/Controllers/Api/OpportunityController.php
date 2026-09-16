<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Opportunities\CreateOpportunityRequest;
use App\Http\Requests\Opportunities\SearchOpportunitiesRequest;
use App\Http\Requests\Opportunities\TransitionOpportunityRequest;
use App\Http\Requests\Opportunities\UpdateOpportunityRequest;
use App\Http\Resources\OpportunityResource;
use App\Models\Application;
use App\Models\Opportunity;
use App\Models\TrainingAssignment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class OpportunityController extends Controller
{
    /**
     * List and search training opportunities.
     *
     * - For company representatives: returns all opportunities (draft, published, etc.) scoped to their own company.
     * - For students: returns only published opportunities from approved companies.
     * - For other authorized users (e.g. training coordinators): returns all opportunities (or filtered).
     *
     * Supports filtering by q (title/department across locales), major_id, skill_id,
     * opportunity_type_id, is_remote, location, with standard pagination.
     * Computes `already_applied` boolean for students based on the applications table.
     */
    public function index(SearchOpportunitiesRequest $request): AnonymousResourceCollection|JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $query = Opportunity::with([
            'company',
            'opportunityType',
            'trainingCycle',
            'majors',
            'skills',
            'requirements',
            'benefits',
        ])->withCount([
            'applications as applicants_count',
            'applications as accepted_applications_count' => fn($q) => $q->where('status', 'accepted'),
        ]);

        if ($user->hasRole('company_representative')) {
            $company = $user->companyRepresentative?->company;

            if (! $company) {
                return OpportunityResource::collection(
                    Opportunity::whereRaw('1 = 0')->paginate((int) $request->input('per_page', 15))
                );
            }

            $query->where('company_id', $company->id);
        } elseif ($user->hasRole('student')) {
            $query->where('status', 'published')
                ->whereHas('company', fn($q) => $q->where('status', 'approved'))
                ->where(function ($q): void {
                    $q->whereNull('application_deadline')
                        ->orWhere(
                            'application_deadline',
                            '>',
                            now()->addHours((int) config('applications.deadline_buffer_hours', 0))
                        );
                });
        }

        // Filter: q (search translatable title and department across locales, case-insensitive)
        if ($request->filled('q')) {
            $searchTerm = mb_strtolower((string) $request->input('q'));
            $query->where(function ($q) use ($searchTerm) {
                $q->whereRaw("LOWER(JSON_UNQUOTE(JSON_EXTRACT(title, '$.ar'))) LIKE ?", ["%{$searchTerm}%"])
                    ->orWhereRaw("LOWER(JSON_UNQUOTE(JSON_EXTRACT(title, '$.en'))) LIKE ?", ["%{$searchTerm}%"])
                    ->orWhereRaw("LOWER(JSON_UNQUOTE(JSON_EXTRACT(department, '$.ar'))) LIKE ?", ["%{$searchTerm}%"])
                    ->orWhereRaw("LOWER(JSON_UNQUOTE(JSON_EXTRACT(department, '$.en'))) LIKE ?", ["%{$searchTerm}%"]);
            });
        }

        // Filter: major_id
        if ($request->filled('major_id')) {
            $majorId = (int) $request->input('major_id');
            $query->whereHas('majors', fn($q) => $q->where('majors.id', $majorId));
        }

        // Filter: skill_id
        if ($request->filled('skill_id')) {
            $skillId = (int) $request->input('skill_id');
            $query->whereHas('skills', fn($q) => $q->where('skills.id', $skillId));
        }

        // Filter: opportunity_type_id
        if ($request->filled('opportunity_type_id')) {
            $query->where('opportunity_type_id', (int) $request->input('opportunity_type_id'));
        }

        // Filter: is_remote
        if ($request->has('is_remote') && $request->input('is_remote') !== null && $request->input('is_remote') !== '') {
            $isRemote = $request->boolean('is_remote');
            if ($isRemote) {
                $query->where('work_mode', 'remote');
            } else {
                $query->where('work_mode', '!=', 'remote');
            }
        }

        // Filter: location
        if ($request->filled('location')) {
            $location = (string) $request->input('location');
            $query->where('location', 'like', "%{$location}%");
        }

        // Filter: status (only meaningful for non-student roles; students are already scoped to published)
        if ($request->filled('status') && ! $user->hasRole('student')) {
            $query->where('status', $request->input('status'));
        }

        $query->orderByDesc('created_at');

        $perPage = (int) $request->input('per_page', 15);
        $opportunities = $query->paginate($perPage);

        // Compute already_applied and has_active_assignment only for students
        if ($user->hasRole('student')) {
            $studentProfile = $user->studentProfile;
            $appliedOpportunityIds = [];
            $hasActiveAssignment = false;

            if ($studentProfile) {
                $hasActiveAssignment = TrainingAssignment::where('student_profile_id', $studentProfile->id)
                    ->whereIn('status', ['active', 'suspended'])
                    ->exists();

                if (Schema::hasTable('applications')) {
                    $pageOpportunityIds = $opportunities->pluck('id')->toArray();
                    if (! empty($pageOpportunityIds)) {
                        $appliedOpportunityIds = DB::table('applications')
                            ->where('student_profile_id', $studentProfile->id)
                            ->whereIn('opportunity_id', $pageOpportunityIds)
                            ->whereNotIn('status', Application::REAPPLYABLE_STATUSES)
                            ->whereNull('deleted_at')
                            ->pluck('opportunity_id')
                            ->toArray();
                    }
                }
            }

            foreach ($opportunities as $opportunity) {
                $opportunity->already_applied = in_array($opportunity->id, $appliedOpportunityIds, true);
                $opportunity->has_active_assignment = $hasActiveAssignment;
            }
        }

        return OpportunityResource::collection($opportunities);
    }

    /**
     * Show a single training opportunity.
     */
    public function show(Request $request, Opportunity $opportunity): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->hasRole('company_representative')) {
            $company = $user->companyRepresentative?->company;
            if (! $company || $opportunity->company_id !== $company->id) {
                return response()->json([
                    'message' => __('opportunities.not_found', [
                        'default' => 'Training opportunity not found.',
                    ]),
                ], 404);
            }
        } elseif ($user->hasRole('student')) {
            if ($opportunity->status !== 'published' || $opportunity->company?->status !== 'approved') {
                return response()->json([
                    'message' => __('opportunities.not_found', [
                        'default' => 'Training opportunity not found.',
                    ]),
                ], 404);
            }

            $studentProfile = $user->studentProfile;
            $opportunity->already_applied = false;
            $opportunity->has_active_assignment = false;

            if ($studentProfile) {
                $opportunity->has_active_assignment = TrainingAssignment::where('student_profile_id', $studentProfile->id)
                    ->whereIn('status', ['active', 'suspended'])
                    ->exists();

                if (Schema::hasTable('applications')) {
                    $opportunity->already_applied = DB::table('applications')
                        ->where('student_profile_id', $studentProfile->id)
                        ->where('opportunity_id', $opportunity->id)
                        ->whereNotIn('status', Application::REAPPLYABLE_STATUSES)
                        ->whereNull('deleted_at')
                        ->exists();
                }
            }
        }

        $opportunity->load([
            'company',
            'opportunityType',
            'trainingCycle',
            'majors',
            'skills',
            'requirements',
            'benefits',
        ]);

        $opportunity->loadCount([
            'applications as applicants_count',
            'applications as accepted_applications_count' => fn($q) => $q->where('status', 'accepted'),
        ]);

        return (new OpportunityResource($opportunity))
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Create a new training opportunity draft.
     *
     * Gated by opportunities.own.create permission and company approval status check.
     */
    public function store(CreateOpportunityRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $companyRepresentative = $user->companyRepresentative;
        $company = $companyRepresentative?->company;

        // Strict business rule: The company must be approved before creating an opportunity.
        if (! $company || $company->status !== 'approved') {
            return response()->json([
                'message' => __('opportunities.company_not_approved', [
                    'default' => 'Your company must be approved by the university before you can create training opportunities.',
                ]),
                'error_code' => 'company_not_approved',
            ], 403);
        }

        $opportunity = DB::transaction(function () use ($request, $user, $company): Opportunity {
            $department = null;
            if ($request->filled('department_ar') || $request->filled('department_en')) {
                $department = [
                    'ar' => $request->input('department_ar') ?? '',
                    'en' => $request->input('department_en') ?? '',
                ];
            }

            /** @var Opportunity $opportunity */
            $opportunity = Opportunity::create([
                'company_id' => $company->id,
                'opportunity_type_id' => $request->integer('opportunity_type_id'),
                'training_cycle_id' => $request->filled('training_cycle_id') ? $request->integer('training_cycle_id') : null,
                'created_by' => $user->id,
                'title' => [
                    'ar' => $request->string('title_ar')->toString(),
                    'en' => $request->string('title_en')->toString(),
                ],
                'department' => $department,
                'description' => [
                    'ar' => $request->string('description_ar')->toString(),
                    'en' => $request->string('description_en')->toString(),
                ],
                'work_mode' => $request->input('work_mode', 'full_time'),
                'location' => $request->input('location'),
                'duration' => $request->input('duration'),
                'capacity' => $request->integer('capacity'),
                'salary' => $request->filled('salary') ? (float) $request->input('salary') : null,
                'start_date' => $request->input('start_date'),
                'end_date' => $request->input('end_date'),
                'application_deadline' => $request->input('application_deadline'),
                'status' => 'draft',
                'version' => 1,
            ]);

            // Sync majors if provided
            if ($request->has('major_ids') && is_array($request->input('major_ids'))) {
                $opportunity->majors()->sync($request->input('major_ids'));
            }

            // Sync skills if provided
            if ($request->has('skill_ids') && is_array($request->input('skill_ids'))) {
                $opportunity->skills()->sync($request->input('skill_ids'));
            }

            // Create requirements with sort_order and bilingual translations
            $requirementsAr = $request->input('requirements_ar', []);
            $requirementsEn = $request->input('requirements_en', []);
            if (is_array($requirementsAr) && is_array($requirementsEn)) {
                foreach ($requirementsAr as $index => $reqArText) {
                    $reqEnText = $requirementsEn[$index] ?? '';
                    $opportunity->requirements()->create([
                        'requirement_text' => [
                            'ar' => $reqArText,
                            'en' => $reqEnText,
                        ],
                        'sort_order' => $index,
                    ]);
                }
            }

            // Create benefits with sort_order and bilingual translations
            $benefitsAr = $request->input('benefits_ar', []);
            $benefitsEn = $request->input('benefits_en', []);
            if (is_array($benefitsAr) && is_array($benefitsEn)) {
                foreach ($benefitsAr as $index => $benArText) {
                    $benEnText = $benefitsEn[$index] ?? '';
                    $opportunity->benefits()->create([
                        'benefit_text' => [
                            'ar' => $benArText,
                            'en' => $benEnText,
                        ],
                        'sort_order' => $index,
                    ]);
                }
            }

            return $opportunity;
        });

        $opportunity->load([
            'company',
            'opportunityType',
            'trainingCycle',
            'majors',
            'skills',
            'requirements',
            'benefits',
        ]);

        return (new OpportunityResource($opportunity))
            ->additional([
                'message' => __('opportunities.created_successfully', [
                    'default' => 'Opportunity draft created successfully.',
                ]),
            ])
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Edit / update an existing training opportunity.
     *
     * Gated by opportunities.own.update permission and optimistic concurrency version check.
     */
    public function update(UpdateOpportunityRequest $request, Opportunity $opportunity): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $companyRepresentative = $user->companyRepresentative;
        $company = $companyRepresentative?->company;

        // Company approval check
        if (! $company || $company->status !== 'approved') {
            return response()->json([
                'message' => __('opportunities.company_not_approved', [
                    'default' => 'Your company must be approved by the university before you can manage training opportunities.',
                ]),
                'error_code' => 'company_not_approved',
            ], 403);
        }

        // Ownership check
        if ($opportunity->company_id !== $company->id) {
            return response()->json([
                'message' => __('opportunities.unauthorized_company', [
                    'default' => 'You are not authorized to manage opportunities for this company.',
                ]),
                'error_code' => 'unauthorized_company',
            ], 403);
        }

        // Status check: closed, completed, and archived opportunities cannot be edited
        if (in_array($opportunity->status, ['closed', 'completed', 'archived'], true)) {
            return response()->json([
                'message' => __('opportunities.cannot_edit_closed', [
                    'default' => 'Closed, completed, or archived opportunities cannot be edited.',
                ]),
                'error_code' => 'cannot_edit_closed',
            ], 403);
        }

        // Optimistic concurrency version check
        if ($request->integer('version') !== $opportunity->version) {
            return response()->json([
                'message' => __('opportunities.version_mismatch', [
                    'default' => 'This opportunity was modified by another user. Please reload the latest version before submitting.',
                ]),
                'error_code' => 'version_mismatch',
            ], 409);
        }

        $opportunity = DB::transaction(function () use ($request, $opportunity): Opportunity {
            // Update title
            if ($request->has('title_ar') || $request->has('title_en')) {
                $opportunity->setTranslation('title', 'ar', $request->input('title_ar', $opportunity->getTranslation('title', 'ar')));
                $opportunity->setTranslation('title', 'en', $request->input('title_en', $opportunity->getTranslation('title', 'en')));
            }

            // Update department
            if ($request->has('department_ar') || $request->has('department_en')) {
                $deptAr = $request->input('department_ar');
                $deptEn = $request->input('department_en');
                if ($deptAr !== null || $deptEn !== null) {
                    $opportunity->setTranslation('department', 'ar', $deptAr ?? $opportunity->getTranslation('department', 'ar', false) ?? '');
                    $opportunity->setTranslation('department', 'en', $deptEn ?? $opportunity->getTranslation('department', 'en', false) ?? '');
                }
            }

            // Update description
            if ($request->has('description_ar') || $request->has('description_en')) {
                $opportunity->setTranslation('description', 'ar', $request->input('description_ar', $opportunity->getTranslation('description', 'ar')));
                $opportunity->setTranslation('description', 'en', $request->input('description_en', $opportunity->getTranslation('description', 'en')));
            }

            if ($request->has('opportunity_type_id')) {
                $opportunity->opportunity_type_id = $request->integer('opportunity_type_id');
            }

            if ($request->has('training_cycle_id')) {
                $opportunity->training_cycle_id = $request->filled('training_cycle_id') ? $request->integer('training_cycle_id') : null;
            }

            if ($request->has('work_mode')) {
                $opportunity->work_mode = (string) $request->input('work_mode');
            }

            if ($request->has('location')) {
                $opportunity->location = $request->input('location');
            }

            if ($request->has('duration')) {
                $opportunity->duration = $request->input('duration');
            }

            if ($request->has('capacity')) {
                $opportunity->capacity = $request->integer('capacity');
            }

            if ($request->has('salary')) {
                $opportunity->salary = $request->filled('salary') ? (float) $request->input('salary') : null;
            }

            if ($request->has('start_date')) {
                $opportunity->start_date = $request->input('start_date');
            }

            if ($request->has('end_date')) {
                $opportunity->end_date = $request->input('end_date');
            }

            if ($request->has('application_deadline')) {
                $opportunity->application_deadline = $request->input('application_deadline');
            }

            // Sync majors if supplied
            if ($request->has('major_ids')) {
                $opportunity->majors()->sync($request->input('major_ids', []));
            }

            // Sync skills if supplied
            if ($request->has('skill_ids')) {
                $opportunity->skills()->sync($request->input('skill_ids', []));
            }

            // Replace requirements if supplied
            if ($request->has('requirements_ar') || $request->has('requirements_en')) {
                $opportunity->requirements()->delete();
                $requirementsAr = $request->input('requirements_ar', []);
                $requirementsEn = $request->input('requirements_en', []);
                if (is_array($requirementsAr) && is_array($requirementsEn)) {
                    foreach ($requirementsAr as $index => $reqArText) {
                        $reqEnText = $requirementsEn[$index] ?? '';
                        $opportunity->requirements()->create([
                            'requirement_text' => [
                                'ar' => $reqArText,
                                'en' => $reqEnText,
                            ],
                            'sort_order' => $index,
                        ]);
                    }
                }
            }

            // Replace benefits if supplied
            if ($request->has('benefits_ar') || $request->has('benefits_en')) {
                $opportunity->benefits()->delete();
                $benefitsAr = $request->input('benefits_ar', []);
                $benefitsEn = $request->input('benefits_en', []);
                if (is_array($benefitsAr) && is_array($benefitsEn)) {
                    foreach ($benefitsAr as $index => $benArText) {
                        $benEnText = $benefitsEn[$index] ?? '';
                        $opportunity->benefits()->create([
                            'benefit_text' => [
                                'ar' => $benArText,
                                'en' => $benEnText,
                            ],
                            'sort_order' => $index,
                        ]);
                    }
                }
            }

            // Increment version by 1
            $opportunity->version = $opportunity->version + 1;
            $opportunity->save();

            return $opportunity;
        });

        $opportunity->load([
            'company',
            'opportunityType',
            'trainingCycle',
            'majors',
            'skills',
            'requirements',
            'benefits',
        ]);

        return (new OpportunityResource($opportunity))
            ->additional([
                'message' => __('opportunities.updated_successfully', [
                    'default' => 'Opportunity updated successfully.',
                ]),
            ])
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Transition the status of an opportunity (draft -> published -> closed -> archived).
     *
     * Gated by specific status permissions (publish / close / archive) and optimistic concurrency.
     */
    public function transition(TransitionOpportunityRequest $request, Opportunity $opportunity): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $companyRepresentative = $user->companyRepresentative;
        $company = $companyRepresentative?->company;

        $toStatus = (string) $request->input('to_status');

        // Company approval check:
        // Suspended companies may still close or archive opportunities (TEP-628), but cannot publish.
        // Other non-approved company statuses (pending, changes_requested, rejected) cannot manage opportunities.
        if (! $company || ($company->status !== 'approved' && $company->status !== 'suspended')) {
            return response()->json([
                'message' => __('opportunities.company_not_approved', [
                    'default' => 'Your company must be approved by the university before you can manage training opportunities.',
                ]),
                'error_code' => 'company_not_approved',
            ], 403);
        }

        if ($company->status === 'suspended' && $toStatus === 'published') {
            return response()->json([
                'message' => __('opportunities.company_suspended', [
                    'default' => 'Suspended companies cannot publish opportunities.',
                ]),
                'error_code' => 'company_suspended',
            ], 403);
        }

        // Ownership check
        if ($opportunity->company_id !== $company->id) {
            return response()->json([
                'message' => __('opportunities.unauthorized_company', [
                    'default' => 'You are not authorized to manage opportunities for this company.',
                ]),
                'error_code' => 'unauthorized_company',
            ], 403);
        }

        // Permission check per target status
        $permissionMap = [
            'published' => 'opportunities.own.publish',
            'closed' => 'opportunities.own.close',
            'archived' => 'opportunities.own.archive',
        ];

        $requiredPermission = $permissionMap[$toStatus] ?? null;
        if (! $requiredPermission || ! $user->hasPermission($requiredPermission)) {
            return response()->json([
                'message' => __('auth.unauthorized', [
                    'default' => 'You do not have permission to perform this status transition.',
                ]),
                'error_code' => 'forbidden',
            ], 403);
        }

        // Valid transition state machine
        $allowedTransitions = [
            'draft' => ['published'],
            'published' => ['closed'],
            'closed' => ['archived'],
        ];

        $allowed = $allowedTransitions[$opportunity->status] ?? [];
        if (! in_array($toStatus, $allowed, true)) {
            return response()->json([
                'message' => __('opportunities.invalid_transition', [
                    'from' => $opportunity->status,
                    'to' => $toStatus,
                    'allowed' => implode(', ', $allowed) ?: 'none',
                    'default' => "The requested status transition from {$opportunity->status} to {$toStatus} is invalid.",
                ]),
                'error_code' => 'invalid_transition',
                'allowed_transitions' => $allowed,
            ], 422);
        }

        // Optimistic concurrency version check
        if ($request->integer('version') !== $opportunity->version) {
            return response()->json([
                'message' => __('opportunities.version_mismatch', [
                    'default' => 'This opportunity was modified by another user. Please reload the latest version before submitting.',
                ]),
                'error_code' => 'version_mismatch',
            ], 409);
        }

        $opportunity = DB::transaction(function () use ($opportunity, $toStatus): Opportunity {
            if ($toStatus === 'published' && $opportunity->published_at === null) {
                $opportunity->published_at = now();
            }

            $opportunity->status = $toStatus;
            $opportunity->version = $opportunity->version + 1;
            $opportunity->save();

            return $opportunity;
        });

        $opportunity->load([
            'company',
            'opportunityType',
            'trainingCycle',
            'majors',
            'skills',
            'requirements',
            'benefits',
        ]);

        return (new OpportunityResource($opportunity))
            ->additional([
                'message' => __('opportunities.transitioned_successfully', [
                    'default' => 'Opportunity status updated successfully.',
                ]),
            ])
            ->response()
            ->setStatusCode(200);
    }
}
