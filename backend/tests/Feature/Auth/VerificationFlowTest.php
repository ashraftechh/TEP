<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\Major;
use App\Models\User;
use App\Notifications\Auth\VerifyEmailNotification;
use Database\Seeders\RoleSeeder;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/**
 * Build a valid temporary signed URL for the given user's email verification.
 */
function signedVerificationPathFor(User $user, int $minutesFromNow = 60): string
{
    $url = URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes($minutesFromNow),
        ['id' => $user->id, 'hash' => sha1($user->email)],
    );

    $parsed = parse_url($url);

    return $parsed['path'].'?'.($parsed['query'] ?? '');
}

// ---------------------------------------------------------------------------
// 1. Registration fires VerifyEmail notification
// ---------------------------------------------------------------------------

describe('Registration → email verification notification', function () {
    beforeEach(fn () => $this->seed(RoleSeeder::class));

    test('registering a student sends a VerifyEmail notification to the new user', function () {
        Notification::fake();

        // Major requires college → department → major (no factory exists)
        $collegeId = DB::table('colleges')->insertGetId([
            'code' => 'tep576_eng',
            'name' => json_encode(['en' => 'College of Engineering', 'ar' => 'كلية الهندسة']),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $deptId = DB::table('departments')->insertGetId([
            'college_id' => $collegeId,
            'code' => 'tep576_swe',
            'name' => json_encode(['en' => 'Software Engineering', 'ar' => 'هندسة البرمجيات']),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $major = Major::create([
            'department_id' => $deptId,
            'code' => 'tep576_major',
            'name' => ['en' => 'Software Engineering', 'ar' => 'هندسة برمجيات'],
            'is_active' => true,
        ]);

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Amira Hassan',
            'email' => 'amira@example.com',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
            'account_type' => 'student',
            'major_id' => $major->id,
        ])->assertCreated();

        $user = User::where('email', 'amira@example.com')->firstOrFail();

        Notification::assertSentTo($user, VerifyEmailNotification::class);
    });
});

// ---------------------------------------------------------------------------
// 2. Valid signed link → email_verified_at set, status active
// ---------------------------------------------------------------------------

describe('Email verification link — success path', function () {
    test('valid signed link sets email_verified_at and transitions status from pending to active', function () {
        Event::fake([Verified::class]);

        $user = User::factory()->unverified()->create(['status' => 'pending']);

        expect($user->email_verified_at)->toBeNull()
            ->and($user->status)->toBe('pending');

        Sanctum::actingAs($user);

        $this->getJson(signedVerificationPathFor($user))->assertOk();

        $user->refresh();
        expect($user->email_verified_at)->not->toBeNull()
            ->and($user->status)->toBe('active');

        Event::assertDispatched(Verified::class);
    });
});

// ---------------------------------------------------------------------------
// 3. Expired / tampered link → 403, DB state unchanged
// ---------------------------------------------------------------------------

describe('Email verification link — invalid/expired link', function () {
    test('expired signed URL returns 403 and leaves the account in pending state', function () {
        $user = User::factory()->unverified()->create(['status' => 'pending']);

        Sanctum::actingAs($user);

        // URL that expired 1 second ago
        $expiredPath = (function () use ($user): string {
            $url = URL::temporarySignedRoute(
                'verification.verify',
                now()->subSecond(),
                ['id' => $user->id, 'hash' => sha1($user->email)],
            );
            $parsed = parse_url($url);

            return $parsed['path'].'?'.($parsed['query'] ?? '');
        })();

        $this->getJson($expiredPath)->assertStatus(403);

        $user->refresh();
        expect($user->email_verified_at)->toBeNull()
            ->and($user->status)->toBe('pending');
    });

    test('tampered hash in URL returns 403 and leaves the account in pending state', function () {
        $user = User::factory()->unverified()->create(['status' => 'pending']);

        Sanctum::actingAs($user);

        // Valid id, wrong hash
        $tamperedPath = (function () use ($user): string {
            $url = URL::temporarySignedRoute(
                'verification.verify',
                now()->addHour(),
                ['id' => $user->id, 'hash' => sha1('attacker@example.com')],
            );
            $parsed = parse_url($url);

            return $parsed['path'].'?'.($parsed['query'] ?? '');
        })();

        $this->getJson($tamperedPath)->assertStatus(403);

        $user->refresh();
        expect($user->email_verified_at)->toBeNull()
            ->and($user->status)->toBe('pending');
    });
});

// ---------------------------------------------------------------------------
// 4. Pending user on a 'verified' protected route receives email_not_verified
//
// NOTE: TEP-560 (login endpoint) has not been implemented yet. This test
// exercises the verification guard (EnsureEmailIsVerified middleware) against
// a protected route because there is no POST /auth/login endpoint in the
// codebase at time of writing. Once TEP-560 is merged, an additional test
// should be added that hits the real login endpoint and asserts the same
// distinguishable error_code in the login flow's business-logic check.
// ---------------------------------------------------------------------------

describe('Pending user → distinguishable email_not_verified response', function () {
    beforeEach(function () {
        Route::middleware(['auth:sanctum', 'verified'])
            ->get('/api/v1/test/tep576-protected', fn () => response()->json(['ok' => true]));
    });

    test('authenticated pending user accessing a verified route receives 403 with error_code email_not_verified', function () {
        $user = User::factory()->unverified()->create(['status' => 'pending']);

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/test/tep576-protected')
            ->assertStatus(403)
            ->assertJson([
                'error_code' => 'email_not_verified',
                'message' => __('auth.email_not_verified'),
            ]);
    });

    test('response is distinguishable from a generic 401 — it contains error_code not just a 401 status', function () {
        $user = User::factory()->unverified()->create(['status' => 'pending']);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/test/tep576-protected');

        // Must be 403, NOT 401 — so the frontend can show "please verify" vs "invalid credentials"
        $response->assertStatus(403);

        // Must carry the machine-readable error_code the frontend inspects
        $data = $response->json();
        expect($data)->toHaveKey('error_code')
            ->and($data['error_code'])->toBe('email_not_verified');
    });
});

// ---------------------------------------------------------------------------
// 5. Resend endpoint rate limiting — 7th request is throttled (429)
// ---------------------------------------------------------------------------

describe('Resend verification endpoint rate limiting', function () {
    test('seventh resend request within a minute is throttled with 429', function () {
        Notification::fake();

        $user = User::factory()->unverified()->create(['status' => 'pending']);

        Sanctum::actingAs($user);

        // First 6 requests must succeed (rate limit = throttle:6,1)
        for ($i = 1; $i <= 6; $i++) {
            $this->postJson('/api/v1/auth/email/resend')
                ->assertOk();
        }

        // 7th request must be rejected with HTTP 429 Too Many Requests
        $this->postJson('/api/v1/auth/email/resend')
            ->assertStatus(429);
    });
});
