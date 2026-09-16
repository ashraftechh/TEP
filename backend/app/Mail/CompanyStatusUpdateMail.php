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

class CompanyStatusUpdateMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     *
     * @param  Company  $company  The company model.
     * @param  string  $status  The target status ('rejected' or 'changes_requested').
     * @param  string  $reason  The explanation provided by coordinator.
     * @param  string|null  $recipientName  Optional recipient contact name.
     * @param  string  $locale  The primary locale (default 'ar').
     * @param  string|null  $registrationUrl  Link back to the registration form (for changes_requested only).
     */
    public function __construct(
        public Company $company,
        public string $status,
        public string $reason,
        public ?string $recipientName = null,
        ?string $locale = 'ar',
        public ?string $registrationUrl = null,
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

        $subjectKey = match ($this->status) {
            'changes_requested' => 'emails.company_changes_requested.subject',
            'suspended' => 'emails.company_suspended.subject',
            'reactivated' => 'emails.company_reactivated.subject',
            default => 'emails.company_rejected.subject',
        };

        return new Envelope(
            subject: __($subjectKey, ['company' => $companyName], $this->locale),
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        $companyName = is_array($this->company->name)
            ? ($this->company->name[$this->locale] ?? $this->company->name['ar'] ?? $this->company->name['en'] ?? '')
            : (string) $this->company->name;

        return new Content(
            view: 'emails.companies.status-update',
            with: [
                'company' => $this->company,
                'companyName' => $companyName,
                'status' => $this->status,
                'reason' => $this->reason,
                'recipientName' => $this->recipientName,
                'locale' => $this->locale,
                'registrationUrl' => $this->registrationUrl,
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
