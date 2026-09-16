<?php

declare(strict_types=1);

namespace App\Notifications\Auth;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;

class VerifyEmailNotification extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(public ?string $forcedLocale = null)
    {
        $this->locale = $forcedLocale ?? app()->getLocale() ?: 'ar';
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $locale = $this->locale ?: ($notifiable->preferredLocale() ?? 'ar');
        $verificationUrl = $this->verificationUrl($notifiable);
        $expireMinutes = Config::integer('auth.verification.expire', 60);

        return (new MailMessage)
            ->subject(__('emails.verify_email.subject', [], $locale))
            ->view('emails.auth.verify-email', [
                'locale' => $locale,
                'name' => $notifiable->name ?? '',
                'url' => $verificationUrl,
                'expireMinutes' => $expireMinutes,
            ]);
    }

    /**
     * Get the verification URL for the given notifiable.
     */
    protected function verificationUrl(object $notifiable): string
    {
        $id = $notifiable->getKey();
        $hash = sha1($notifiable->getEmailForVerification());
        $expiry = Carbon::now()->addMinutes(Config::integer('auth.verification.expire', 60));

        $backendUrl = URL::temporarySignedRoute(
            'verification.verify',
            $expiry,
            ['id' => $id, 'hash' => $hash],
        );

        $parsed = parse_url($backendUrl);
        $frontendBase = rtrim(Config::string('app.frontend_url', 'http://localhost:5173'), '/');

        return $frontendBase.'/verify-email?'.http_build_query([
            'id' => $id,
            'hash' => $hash,
        ]).'&'.($parsed['query'] ?? '');
    }
}
