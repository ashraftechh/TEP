@extends('emails.layouts.master')

@section('content')
    <!-- Title / Icon Badge -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td style="padding-bottom: 20px;">
                <h1 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                    {{ __('emails.reset_password.title') }}
                </h1>
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #003366;">
                    {{ !empty($name) ? __('emails.greeting', ['name' => $name]) : __('emails.default_greeting') }}
                </p>
            </td>
        </tr>
    </table>

    <!-- Intro Paragraph -->
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #334155; line-height: 1.7;">
        {{ __('emails.reset_password.intro') }}
    </p>

    <!-- Call to Action Button -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
        <tr>
            <td align="center" style="padding: 6px 0;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                        <td align="center" style="background-color: #003366; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,51,102,0.25);">
                            <a href="{{ $url }}" target="_blank" rel="noopener noreferrer"
                               style="display: inline-block; background-color: #003366; color: #ffffff !important; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; text-align: center; letter-spacing: 0.2px; mso-padding-alt: 14px 32px;">
                                {{ __('emails.reset_password.action') }}
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
                <strong style="color: #0f172a;">&#9432; {{ __('emails.reset_password.expire_notice', ['count' => $expireMinutes ?? 60]) }}</strong>
                <div style="margin-top: 4px; font-size: 12px; color: #64748b;">
                    {{ __('emails.reset_password.no_action_required') }}
                </div>
            </td>
        </tr>
    </table>

    <!-- Fallback Direct URL -->
    <div style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">
            {{ __('emails.trouble_clicking') }}
        </p>
        <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 12px; word-break: break-all; font-family: monospace, monospace; font-size: 12px; color: #003366;">
            <a href="{{ $url }}" target="_blank" rel="noopener noreferrer" style="color: #003366; text-decoration: underline; font-size: 12px; word-break: break-all;">
                {{ $url }}
            </a>
        </div>
    </div>
@endsection
