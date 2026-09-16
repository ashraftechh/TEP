<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Company;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CompanyJoinInviteMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     *
     * @param  Company  $company  The company associated with the invitation.
     * @param  string  $inviteUrl  The signed invitation URL.
     * @param  string|null  $recipientName  Optional recipient name for personalized greeting.
     * @param  string  $locale  The primary locale (defaults to Arabic).
     * @param  int  $validDays  Number of days the invitation is valid for.
     */
    public function __construct(
        public Company $company,
        public string $inviteUrl,
        public ?string $recipientName = null,
        ?string $locale = 'ar',
        public int $validDays = 7,
    ) {
        $this->locale = $locale ?? 'ar';
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $companyName = is_array($this->company->name)
            ? ($this->company->name[$this->locale] ?? $this->company->name['ar'] ?? $this->company->name['en'] ?? '')
            : (string) $this->company->name;

        return new Envelope(
            subject: __('emails.company_join_invite.subject', ['company' => $companyName], $this->locale),
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        $companyNameAr = is_array($this->company->name)
            ? ($this->company->name['ar'] ?? $this->company->name['en'] ?? '')
            : (string) $this->company->name;

        $companyNameEn = is_array($this->company->name)
            ? ($this->company->name['en'] ?? $this->company->name['ar'] ?? '')
            : (string) $this->company->name;

        $companyName = $this->locale === 'ar' ? $companyNameAr : $companyNameEn;

        return new Content(
            view: 'emails.companies.join-invite',
            with: [
                'company' => $this->company,
                'companyName' => $companyName,
                'companyNameEn' => $companyNameEn,
                'inviteUrl' => $this->inviteUrl,
                'recipientName' => $this->recipientName,
                'locale' => $this->locale,
                'validDays' => $this->validDays,
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
