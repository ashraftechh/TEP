@extends('emails.layouts.master')

@section('content')
    <!-- Title / Icon Badge -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td style="padding-bottom: 20px;">
                <h1 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                    {{ __('emails.company_join_invite.title', ['company' => $companyName], $locale) }}
                </h1>
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #003366;">
                    {{ !empty($recipientName) ? __('emails.greeting', ['name' => $recipientName], $locale) : __('emails.default_greeting', [], $locale) }}
                </p>
            </td>
        </tr>
    </table>

    <!-- Intro Paragraph -->
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #334155; line-height: 1.7;">
        {{ __('emails.company_join_invite.intro', ['company' => $companyName], $locale) }}
    </p>

    <!-- Call to Action Button -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
        <tr>
            <td align="center" style="padding: 6px 0;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                        <td align="center" style="background-color: #003366; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,51,102,0.25);">
                            <a href="{{ $inviteUrl }}" target="_blank" rel="noopener noreferrer"
                               style="display: inline-block; background-color: #003366; color: #ffffff !important; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; text-align: center; letter-spacing: 0.2px; mso-padding-alt: 14px 32px;">
                                {{ __('emails.company_join_invite.action', [], $locale) }}
                            </a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <!-- Expiration Warning Alert Box -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
        <tr>
            <td style="background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; font-size: 13px; color: #475569;">
                <strong style="color: #0f172a;">&#9432; {{ __('emails.company_join_invite.expire_notice', ['count' => $validDays ?? 7], $locale) }}</strong>
                <div style="margin-top: 4px; font-size: 12px; color: #64748b;">
                    {{ __('emails.company_join_invite.no_action_required', [], $locale) }}
                </div>
            </td>
        </tr>
    </table>

    <!-- Bilingual English fallback section for international contacts -->
    @if($locale === 'ar')
        <div style="border-top: 1px dashed #cbd5e1; margin-top: 24px; padding-top: 20px; direction: ltr; text-align: left;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #475569; font-weight: 600;">
                {{ __('emails.company_join_invite.title', ['company' => $companyNameEn ?? $companyName], 'en') }}
            </p>
            <p style="margin: 0 0 16px 0; font-size: 12px; color: #64748b; line-height: 1.6;">
                {{ __('emails.company_join_invite.intro', ['company' => $companyNameEn ?? $companyName], 'en') }}
            </p>
        </div>
    @endif

    <!-- Fallback Direct URL -->
    <div style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">
            {{ __('emails.trouble_clicking', [], $locale) }}
        </p>
        <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 12px; word-break: break-all; font-family: monospace, monospace; font-size: 12px; color: #003366;">
            <a href="{{ $inviteUrl }}" target="_blank" rel="noopener noreferrer" style="color: #003366; text-decoration: underline; font-size: 12px; word-break: break-all;">
                {{ $inviteUrl }}
            </a>
        </div>
    </div>
@endsection
