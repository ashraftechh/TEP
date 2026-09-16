@extends('emails.layouts.master')

@section('content')
    @php
        $isSuspended   = $status === 'suspended';
        $isReactivated = $status === 'reactivated';
        $isChanges     = $status === 'changes_requested';
        $isRejected    = $status === 'rejected';
    @endphp

    <!-- Title / Icon Badge -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td style="padding-bottom: 20px;">
                <h1 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                    @if($isSuspended)
                        {{ __('emails.company_suspended.title', ['company' => $companyName], $locale) }}
                    @elseif($isReactivated)
                        {{ __('emails.company_reactivated.title', ['company' => $companyName], $locale) }}
                    @elseif($isChanges)
                        {{ __('emails.company_changes_requested.title', ['company' => $companyName], $locale) }}
                    @else
                        {{ __('emails.company_rejected.title', ['company' => $companyName], $locale) }}
                    @endif
                </h1>
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #003366;">
                    {{ !empty($recipientName) ? __('emails.greeting', ['name' => $recipientName], $locale) : __('emails.default_greeting', [], $locale) }}
                </p>
            </td>
        </tr>
    </table>

    <!-- Intro Paragraph -->
    <p style="margin: 0 0 20px 0; font-size: 14px; color: #334155; line-height: 1.7;">
        @if($isSuspended)
            {{ __('emails.company_suspended.intro', ['company' => $companyName], $locale) }}
        @elseif($isReactivated)
            {{ __('emails.company_reactivated.intro', ['company' => $companyName], $locale) }}
        @elseif($isChanges)
            {{ __('emails.company_changes_requested.intro', ['company' => $companyName], $locale) }}
        @else
            {{ __('emails.company_rejected.intro', ['company' => $companyName], $locale) }}
        @endif
    </p>

    @if(!empty($reason) && ($isSuspended || $isChanges || $isRejected))
    <!-- Reason Box -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
        <tr>
            <td style="background-color: {{ $isSuspended ? '#fefce8' : ($isChanges ? '#fffbeb' : '#fef2f2') }}; border: 1px solid {{ $isSuspended ? '#fde047' : ($isChanges ? '#fde68a' : '#fecaca') }}; border-radius: 8px; padding: 16px 20px;">
                <strong style="color: {{ $isSuspended ? '#713f12' : ($isChanges ? '#92400e' : '#991b1b') }}; font-size: 13px; display: block; margin-bottom: 6px;">
                    &#9432;
                    @if($isSuspended)
                        {{ __('emails.company_suspended.reason_title', [], $locale) }}
                    @elseif($isChanges)
                        {{ __('emails.company_changes_requested.reason_title', [], $locale) }}
                    @else
                        {{ __('emails.company_rejected.reason_title', [], $locale) }}
                    @endif
                </strong>
                <p style="margin: 0; font-size: 14px; color: #1e293b; line-height: 1.6; white-space: pre-wrap;">{{ $reason }}</p>
            </td>
        </tr>
    </table>
    @endif

    {{-- CTA Button: only for changes_requested --}}
    @if($isChanges && !empty($registrationUrl))
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
        <tr>
            <td align="center">
                <a href="{{ $registrationUrl }}"
                   target="_blank"
                   style="display: inline-block; background-color: #003366; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 32px; border-radius: 8px; letter-spacing: 0.3px;">
                    {{ __('emails.company_changes_requested.cta_button', [], $locale) }}
                </a>
            </td>
        </tr>
    </table>
    @endif

    {{-- Support Notice --}}
    <div style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
        <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.6;">
            {{ __('emails.support_contact', [], $locale) }}
        </p>
    </div>
@endsection
