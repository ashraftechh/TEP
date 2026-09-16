<?php

declare(strict_types=1);

namespace App\Notifications\Auth;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Config;

class ResetPasswordNotification extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public string $token,
        public ?string $forcedLocale = null
    ) {
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
        $resetUrl = $this->resetUrl($notifiable);
        $expireMinutes = Config::integer('auth.passwords.users.expire', 60);

        return (new MailMessage)
            ->subject(__('emails.reset_password.subject', [], $locale))
            ->view('emails.auth.reset-password', [
                'locale' => $locale,
                'name' => $notifiable->name ?? '',
                'url' => $resetUrl,
                'expireMinutes' => $expireMinutes,
            ]);
    }

    /**
     * Get the reset URL for the given notifiable.
     */
    protected function resetUrl(object $notifiable): string
    {
        $frontendBase = rtrim(Config::string('app.frontend_url', 'http://localhost:5173'), '/');

        return $frontendBase.'/reset-password?'.http_build_query([
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ]);
    }
}
