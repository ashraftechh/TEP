<?php

declare(strict_types=1);

use App\Http\Controllers\Api\ApplicationController;
use App\Http\Controllers\Api\AttendanceRecordController;
use App\Http\Controllers\Api\Auth\CompleteRegistrationController;
use App\Http\Controllers\Api\Auth\EmailVerificationController;
use App\Http\Controllers\Api\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Api\Auth\ForgotPasswordController;
use App\Http\Controllers\Api\Auth\LoginController;
use App\Http\Controllers\Api\Auth\LogoutController;
use App\Http\Controllers\Api\Auth\RegisterController;
use App\Http\Controllers\Api\Auth\ResetPasswordController;
use App\Http\Controllers\Api\Auth\SsoController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\CompanyJoinController;
use App\Http\Controllers\Api\CompanyRegistrationRequestController;
use App\Http\Controllers\Api\CompanyRepresentativeController;
use App\Http\Controllers\Api\FileController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\LookupController;
use App\Http\Controllers\Api\OpportunityController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\TrainingAssignmentController;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Routes registered here are automatically prefixed with "/api/v1" and
| assigned the "api" middleware group by the application bootstrap.
|
*/

// Public health check — no authentication, light rate limiting only.
Route::middleware('throttle:60,1')
    ->get('/health', [HealthController::class, 'check']);

// Public lookup routes (majors, industries, skills, opportunity-types, training-cycles)
Route::middleware('throttle:60,1')->group(function () {
    Route::get('/majors', [LookupController::class, 'majors']);
    Route::get('/industries', [LookupController::class, 'industries']);
    Route::get('/skills', [LookupController::class, 'skills']);
    Route::get('/opportunity-types', [LookupController::class, 'opportunityTypes']);
    Route::get('/training-cycles', [LookupController::class, 'trainingCycles']);
});

// Company registration request — public, rate-limited to 3 per hour per IP (spam prevention)
Route::post('/companies/request', CompanyRegistrationRequestController::class)
    ->middleware('throttle:3,60')
    ->name('companies.request');

// Company join signed routes (founding claim + colleague invite)
Route::prefix('companies/join/{company}')->group(function () {
    Route::get('/', [CompanyJoinController::class, 'show'])->name('company.join')->middleware('signed');
    Route::post('/register', [CompanyJoinController::class, 'register'])->name('company.join.register');
});

// Authentication routes
Route::prefix('auth')->group(function () {
    // --- Local auth ---
    Route::post('/register', [RegisterController::class, 'register'])
        ->middleware('guest');

    // Rate limit by IP + email to slow credential stuffing without leaking whether
    // the email exists. The default throttle key is IP; adding |email makes it
    // per-email-per-IP so an attacker can't use a single IP against many emails.
    Route::post('/login', [LoginController::class, 'login'])
        ->middleware(['guest', 'throttle:5,1'])
        ->name('login');

    // Rate limited strictly (3/min) to deter inbox-spamming abuse.
    // Returns the same generic 200 for both valid and nonexistent emails
    // to prevent account enumeration.
    Route::post('/forgot-password', ForgotPasswordController::class)
        ->middleware(['guest', 'throttle:3,1'])
        ->name('auth.forgot_password');

    Route::post('/reset-password', ResetPasswordController::class)
        ->middleware(['guest', 'throttle:5,1'])
        ->name('auth.reset_password');

    Route::get('/me', [LoginController::class, 'me'])
        ->middleware('auth:sanctum')
        ->name('auth.me');

    Route::post('/logout', LogoutController::class)
        ->middleware('auth:sanctum')
        ->name('auth.logout');

    Route::post('/complete-registration', CompleteRegistrationController::class)
        ->middleware('auth:sanctum')
        ->name('auth.complete_registration');

    Route::post('/email/resend', [EmailVerificationNotificationController::class, 'store'])
        ->middleware(['auth:sanctum', 'throttle:6,1'])
        ->name('verification.send');

    Route::get('/verify-email/{id}/{hash}', [EmailVerificationController::class, 'verify'])
        ->middleware(['auth:sanctum', 'signed', 'throttle:6,1'])
        ->name('verification.verify');

    // --- SSO (Google + Microsoft) ---
    // Shared for both Login and Register flows — account type is chosen on
    // /complete-registration after the OAuth handshake succeeds.
    Route::middleware([
        EncryptCookies::class,
        AddQueuedCookiesToResponse::class,
        StartSession::class,
    ])->group(function () {
        Route::get('/{provider}/redirect', [SsoController::class, 'redirect'])
            ->where('provider', 'google|microsoft')
            ->name('auth.sso.redirect');

        Route::get('/{provider}/callback', [SsoController::class, 'callback'])
            ->where('provider', 'google|microsoft')
            ->name('auth.sso.callback');
    });
});

// Profile routes (authenticated)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/profile', [ProfileController::class, 'show'])
        ->name('profile.show');

    Route::patch('/profile', [ProfileController::class, 'update'])
        ->name('profile.update');

    Route::post('/profile/avatar', [ProfileController::class, 'uploadAvatar'])
        ->name('profile.avatar.upload');

    Route::post('/profile/cv', [ProfileController::class, 'uploadCv'])
        ->name('profile.cv.upload');

    Route::post('/profile/change-password', [ProfileController::class, 'changePassword'])
        ->name('profile.password.change');

    Route::post('/profile/skills', [ProfileController::class, 'attachSkill'])
        ->name('profile.skills.attach');

    Route::delete('/profile/skills/{skill_id}', [ProfileController::class, 'detachSkill'])
        ->whereNumber('skill_id')
        ->name('profile.skills.detach');

    Route::delete('/profile/sso/{provider}', [ProfileController::class, 'unlinkSso'])
        ->where('provider', 'google|microsoft')
        ->name('profile.sso.unlink');

    // Generic file upload (requires files.upload permission)
    Route::post('/files/upload', [FileController::class, 'upload'])
        ->middleware('permission:files.upload')
        ->name('files.upload');
});

// Company profile routes (authenticated)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/company', [CompanyController::class, 'show'])
        ->middleware('permission:companies.view')
        ->name('company.show');

    Route::patch('/company', [CompanyController::class, 'update'])
        ->middleware('permission:companies.own.update')
        ->name('company.update');

    Route::post('/company/logo', [CompanyController::class, 'uploadLogo'])
        ->middleware('permission:companies.own.update')
        ->name('company.logo.upload');
});

// Company representative management routes (authenticated)
Route::middleware('auth:sanctum')->prefix('company/representatives')->group(function () {
    Route::get('/', [CompanyRepresentativeController::class, 'index'])
        ->middleware('permission:company_representatives.own.view')
        ->name('company.representatives.index');

    Route::post('/invite', [CompanyRepresentativeController::class, 'invite'])
        ->middleware('permission:company_representatives.own.invite')
        ->name('company.representatives.invite');

    Route::patch('/me', [CompanyRepresentativeController::class, 'updateMe'])
        ->middleware('permission:company_representatives.own.update')
        ->name('company.representatives.me.update');

    Route::patch('/{representative}', [CompanyRepresentativeController::class, 'update'])
        ->whereNumber('representative')
        ->middleware('permission:company_representatives.own.update')
        ->name('company.representatives.update');

    Route::delete('/{representative}', [CompanyRepresentativeController::class, 'destroy'])
        ->whereNumber('representative')
        ->middleware('permission:company_representatives.own.remove')
        ->name('company.representatives.destroy');
});

// Training opportunity management routes (authenticated)
Route::middleware('auth:sanctum')->prefix('opportunities')->group(function () {
    Route::get('/', [OpportunityController::class, 'index'])
        ->middleware('permission:opportunities.view_any')
        ->name('opportunities.index');
    Route::post('/', [OpportunityController::class, 'store'])
        ->middleware('permission:opportunities.own.create')
        ->name('opportunities.store');
    Route::get('/{opportunity}', [OpportunityController::class, 'show'])
        ->whereNumber('opportunity')
        ->middleware('permission:opportunities.view')
        ->name('opportunities.show');
    Route::patch('/{opportunity}', [OpportunityController::class, 'update'])
        ->whereNumber('opportunity')
        ->middleware('permission:opportunities.own.update')
        ->name('opportunities.update');
    Route::post('/{opportunity}/transition', [OpportunityController::class, 'transition'])
        ->whereNumber('opportunity')
        ->name('opportunities.transition');

    // Student application submission
    Route::post('/{opportunity}/applications', [ApplicationController::class, 'store'])
        ->whereNumber('opportunity')
        ->middleware('permission:applications.own.create')
        ->name('opportunities.applications.store');
});

// Student: own application list — TEP-636
// student_profile_id is NEVER a param: ownership is implicit from the token.
Route::middleware('auth:sanctum')->prefix('my')->group(function () {
    Route::get('/applications', [ApplicationController::class, 'index'])
        ->middleware('permission:applications.own.view')
        ->name('my.applications.index');
});

// Student: withdraw own application — TEP-640
// Ownership (application.student_profile_id matches the requester) is
// enforced in WithdrawApplicationRequest::authorize(), not here — same
// division of responsibility as the opportunities own.* routes above.
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/applications/{application}/withdraw', [ApplicationController::class, 'withdraw'])
        ->whereNumber('application')
        ->middleware('permission:applications.own.withdraw')
        ->name('applications.withdraw');
});

// Company representative: review applications to their own company's
// opportunities — TEP-644. Company scoping (application.opportunity.company_id
// matches the acting representative's company_id) is enforced in the
// controller query, not here — same division of responsibility as the
// opportunities own.* routes above.
Route::middleware('auth:sanctum')->prefix('company')->group(function () {
    Route::get('/applications', [ApplicationController::class, 'companyIndex'])
        ->middleware('permission:applications.company.view')
        ->name('company.applications.index');
});

// Company representative: accept / reject an application to their own
// company's opportunity — TEP-648/TEP-649. Ownership (application.opportunity
// .company_id matches the acting representative's company_id) is enforced in
// AcceptApplicationRequest/RejectApplicationRequest::authorize(), not here —
// same division of responsibility as the applications own.* routes above.
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/applications/{application}/accept', [ApplicationController::class, 'accept'])
        ->whereNumber('application')
        ->middleware('permission:applications.company.review')
        ->name('applications.accept');

    Route::post('/applications/{application}/reject', [ApplicationController::class, 'reject'])
        ->whereNumber('application')
        ->middleware('permission:applications.company.review')
        ->name('applications.reject');

    // Company representative: schedule/reschedule an interview for an
    // application to their own company's opportunity — TEP-653. Same
    // permission + ownership pattern as accept/reject above; there is no
    // dedicated `applications.schedule_interview` permission (see
    // ScheduleInterviewRequest for the rationale).
    Route::post('/applications/{application}/interview', [ApplicationController::class, 'scheduleInterview'])
        ->whereNumber('application')
        ->middleware('permission:applications.company.review')
        ->name('applications.interview');

    // Company representative: mark an application as under review — TEP-652.
    Route::post('/applications/{application}/review', [ApplicationController::class, 'review'])
        ->whereNumber('application')
        ->middleware('permission:applications.company.review')
        ->name('applications.review');
});

// Application status transition history — TEP-657. Viewable by either the
// owning student OR the owning company's representative, so it deliberately
// carries no single `permission:` middleware here — both the permission
// check (applications.own.view OR applications.company.view) AND the
// corresponding ownership check are done together in
// ViewApplicationTransitionsRequest::authorize(), same pattern as
// OpportunityController::transition()'s route above.
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/applications/{application}/transitions', [ApplicationController::class, 'transitions'])
        ->whereNumber('application')
        ->name('applications.transitions');
});

// Training coordinator: formalise an accepted application into a training
// assignment — TEP-661. Coordinator-only, no per-row ownership to enforce
// here (any coordinator may formalise any accepted application), unlike the
// applications own.*/company.* routes above.
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/training-assignments', [TrainingAssignmentController::class, 'store'])
        ->middleware('permission:training_assignments.create')
        ->name('training-assignments.store');

    // Training coordinator: transition a training assignment's status
    // (active/suspended/completed/terminated) — TEP-670. Coordinator-only,
    // no per-row ownership to enforce, same as the store route above.
    // The valid from->to pairs are TEP-669's map, enforced inside
    // TransitionTrainingAssignmentAction, not here.
    Route::post('/training-assignments/{trainingAssignment}/transition', [TrainingAssignmentController::class, 'transition'])
        ->whereNumber('trainingAssignment')
        ->middleware('permission:training_assignments.transition')
        ->name('training-assignments.transition');

    // TEP-665 — list training assignments visible to the acting user's
    // role (student/academic_supervisor/company_representative/
    // training_coordinator/super_admin). No single `permission:` middleware
    // here — the OR of training_assignments.own.view / .view_any is
    // checked in ListTrainingAssignmentsRequest::authorize(), same pattern
    // as the applications transitions route above.
    Route::get('/training-assignments', [TrainingAssignmentController::class, 'index'])
        ->name('training-assignments.index');
});

// Student: own single training placement — TEP-665.
// student_profile_id is NEVER a param: ownership is implicit from the
// token, same pattern as /my/applications above.
Route::middleware('auth:sanctum')->prefix('my')->group(function () {
    Route::get('/training-assignment', [TrainingAssignmentController::class, 'myTrainingAssignment'])
        ->middleware('permission:training_assignments.own.view')
        ->name('my.training-assignment.show');

    // Placement history — TEP fix: previous (non-current) assignments for
    // the authenticated student, for a "previous placements" screen.
    Route::get('/training-assignments/history', [TrainingAssignmentController::class, 'myTrainingAssignmentHistory'])
        ->middleware('permission:training_assignments.own.view')
        ->name('my.training-assignments.history');
});

// Attendance records management — TEP-692, TEP-693, TEP-694
Route::middleware('auth:sanctum')->group(function () {
    // TEP-692: Read attendance records & summary for an assignment
    Route::get('/training-assignments/{trainingAssignment}/attendance', [AttendanceRecordController::class, 'indexForAssignment'])
        ->whereNumber('trainingAssignment')
        ->name('training-assignments.attendance.index');

    // TEP-693: Company representative records attendance for an assignment
    Route::post('/training-assignments/{trainingAssignment}/attendance', [AttendanceRecordController::class, 'storeForAssignment'])
        ->whereNumber('trainingAssignment')
        ->middleware('permission:attendance_records.record')
        ->name('training-assignments.attendance.store');

    // TEP-694: Supervisor / Coordinator approves an attendance record
    Route::patch('/attendance-records/{attendanceRecord}/approve', [AttendanceRecordController::class, 'approve'])
        ->whereNumber('attendanceRecord')
        ->middleware('permission:attendance_records.approve')
        ->name('attendance-records.approve');

    // TEP-694: Supervisor / Coordinator rejects an attendance record with reason
    Route::patch('/attendance-records/{attendanceRecord}/reject', [AttendanceRecordController::class, 'reject'])
        ->whereNumber('attendanceRecord')
        ->middleware('permission:attendance_records.approve')
        ->name('attendance-records.reject');
});

// Report drafting & review — TEP-674, TEP-678, TEP-682
Route::middleware('auth:sanctum')->group(function () {
    // TEP-674 / TEP-682: List reports (authorized via ListReportsRequest for students/supervisors)
    Route::get('/reports', [ReportController::class, 'index'])
        ->name('reports.index');

    // TEP-674: Student creates a report draft for their active assignment
    Route::post('/reports', [ReportController::class, 'store'])
        ->middleware('permission:reports.own.create')
        ->name('reports.store');

    // TEP-674: Student edits their own report while it is still a draft
    Route::patch('/reports/{report}', [ReportController::class, 'update'])
        ->whereNumber('report')
        ->middleware('permission:reports.own.update')
        ->name('reports.update');

    // TEP-678: Student submits their own draft or revision-requested report
    Route::post('/reports/{report}/submit', [ReportController::class, 'submit'])
        ->whereNumber('report')
        ->middleware('permission:reports.own.submit')
        ->name('reports.submit');

    // TEP-682: Academic supervisor reviews a submitted report
    Route::post('/reports/{report}/review', [ReportController::class, 'review'])
        ->whereNumber('report')
        ->middleware('permission:reports.review')
        ->name('reports.review');

    // TEP-682: View report review history
    Route::get('/reports/{report}/reviews', [ReportController::class, 'reviews'])
        ->whereNumber('report')
        ->name('reports.reviews');

    // TEP-675 dependency: report-type lookup for the create/edit form's
    // select — unlike LookupController's other (public) lookups, this one
    // is permission-gated since report_types.view_any is not granted to
    // guests (see PermissionSeeder).
    Route::get('/report-types', [LookupController::class, 'reportTypes'])
        ->middleware('permission:report_types.view_any')
        ->name('report-types.index');
});
