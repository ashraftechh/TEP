<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\Auth\ResetPasswordNotification;
use App\Notifications\Auth\VerifyEmailNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

test('email verification notification renders correctly in Arabic with RTL layout', function () {
    $user = User::factory()->create([
        'name' => 'سالم محمد',
        'email' => 'salem@example.com',
    ]);

    App::setLocale('ar');
    $notification = new VerifyEmailNotification('ar');
    $mailMessage = $notification->toMail($user);

    expect($mailMessage->subject)->toBe('تأكيد البريد الإلكتروني - منصة التدريب التعاوني')
        ->and($mailMessage->view)->toBe('emails.auth.verify-email');

    $html = (string) view($mailMessage->view, $mailMessage->viewData)->render();

    expect($html)->toContain('dir="rtl"')
        ->and($html)->toContain('lang="ar"')
        ->and($html)->toContain('تأكيد بريدك الإلكتروني')
        ->and($html)->toContain('سالم محمد')
        ->and($html)->toContain('/verify-email?');
});

test('email verification notification renders correctly in English with LTR layout', function () {
    $user = User::factory()->create([
        'name' => 'John Doe',
        'email' => 'john@example.com',
    ]);

    App::setLocale('en');
    $notification = new VerifyEmailNotification('en');
    $mailMessage = $notification->toMail($user);

    expect($mailMessage->subject)->toBe('Verify Your Email Address - Cooperative Training Platform')
        ->and($mailMessage->view)->toBe('emails.auth.verify-email');

    $html = (string) view($mailMessage->view, $mailMessage->viewData)->render();

    expect($html)->toContain('dir="ltr"')
        ->and($html)->toContain('lang="en"')
        ->and($html)->toContain('Verify Your Email Address')
        ->and($html)->toContain('John Doe')
        ->and($html)->toContain('/verify-email?');
});

test('password reset notification renders correctly in Arabic with RTL layout', function () {
    $user = User::factory()->create([
        'name' => 'أحمد علي',
        'email' => 'ahmed@example.com',
    ]);

    App::setLocale('ar');
    $notification = new ResetPasswordNotification('test-reset-token-123', 'ar');
    $mailMessage = $notification->toMail($user);

    expect($mailMessage->subject)->toBe('طلب إعادة تعيين كلمة المرور - منصة التدريب التعاوني')
        ->and($mailMessage->view)->toBe('emails.auth.reset-password');

    $html = (string) view($mailMessage->view, $mailMessage->viewData)->render();

    expect($html)->toContain('dir="rtl"')
        ->and($html)->toContain('lang="ar"')
        ->and($html)->toContain('إعادة تعيين كلمة المرور')
        ->and($html)->toContain('أحمد علي')
        ->and($html)->toContain('/reset-password?')
        ->and($html)->toContain('test-reset-token-123');
});

test('password reset notification renders correctly in English with LTR layout', function () {
    $user = User::factory()->create([
        'name' => 'Jane Smith',
        'email' => 'jane@example.com',
    ]);

    App::setLocale('en');
    $notification = new ResetPasswordNotification('test-reset-token-456', 'en');
    $mailMessage = $notification->toMail($user);

    expect($mailMessage->subject)->toBe('Password Reset Request - Cooperative Training Platform')
        ->and($mailMessage->view)->toBe('emails.auth.reset-password');

    $html = (string) view($mailMessage->view, $mailMessage->viewData)->render();

    expect($html)->toContain('dir="ltr"')
        ->and($html)->toContain('lang="en"')
        ->and($html)->toContain('Reset Your Password')
        ->and($html)->toContain('Jane Smith')
        ->and($html)->toContain('/reset-password?')
        ->and($html)->toContain('test-reset-token-456');
});

test('forgot password endpoint dispatches ResetPasswordNotification in English when Accept-Language is en', function () {
    Notification::fake();

    $user = User::factory()->create(['email' => 'student-en@example.com']);

    $this->postJson('/api/v1/auth/forgot-password', [
        'email' => 'student-en@example.com',
    ], ['Accept-Language' => 'en'])->assertOk();

    Notification::assertSentTo($user, ResetPasswordNotification::class, function (ResetPasswordNotification $n) {
        return $n->locale === 'en';
    });
});

test('forgot password endpoint dispatches ResetPasswordNotification in Arabic when Accept-Language is ar', function () {
    Notification::fake();

    $user = User::factory()->create(['email' => 'student-ar@example.com']);

    $this->postJson('/api/v1/auth/forgot-password', [
        'email' => 'student-ar@example.com',
    ], ['Accept-Language' => 'ar'])->assertOk();

    Notification::assertSentTo($user, ResetPasswordNotification::class, function (ResetPasswordNotification $n) {
        return $n->locale === 'ar';
    });
});
