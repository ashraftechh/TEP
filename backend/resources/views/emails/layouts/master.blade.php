<!DOCTYPE html>
<html lang="{{ $locale ?? app()->getLocale() }}" dir="{{ ($locale ?? app()->getLocale()) === 'ar' ? 'rtl' : 'ltr' }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>{{ $title ?? __('emails.platform_name') }}</title>
    <style type="text/css">
        /* Base Reset */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
        body { margin: 0 !important; padding: 0 !important; width: 100% !important; height: 100% !important; background-color: #f8fafc; }
        
        /* Fonts */
        @media screen {
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        }

        .email-body {
            font-family: {{ ($locale ?? app()->getLocale()) === 'ar' ? "'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif" : "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }};
            color: #1e293b;
            line-height: 1.6;
            direction: {{ ($locale ?? app()->getLocale()) === 'ar' ? 'rtl' : 'ltr' }};
            text-align: {{ ($locale ?? app()->getLocale()) === 'ar' ? 'right' : 'left' }};
        }

        .btn-primary {
            display: inline-block;
            background: linear-gradient(135deg, #003366 0%, #002244 100%);
            background-color: #003366;
            color: #ffffff !important;
            font-size: 15px;
            font-weight: 600;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 51, 102, 0.25);
            text-align: center;
        }

        .btn-primary:hover {
            background: linear-gradient(135deg, #002244 0%, #00172e 100%);
            background-color: #002244;
        }

        .alert-box {
            background-color: #f1f5f9;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 14px 18px;
            font-size: 13px;
            color: #475569;
        }

        .link-box {
            background-color: #f8fafc;
            border: 1px dashed #cbd5e1;
            border-radius: 6px;
            padding: 12px;
            word-break: break-all;
            font-family: monospace, monospace;
            font-size: 12px;
            color: #003366;
        }

        @media only screen and (max-width: 600px) {
            .container-table { width: 100% !important; padding: 10px !important; }
            .card-content { padding: 24px 20px !important; }
            .btn-primary { width: 100% !important; box-sizing: border-box !important; }
        }
    </style>
</head>
<body class="email-body" style="margin: 0; padding: 0; background-color: #f8fafc; width: 100%;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; width: 100%;">
        <tr>
            <td align="center" style="padding: 40px 16px;">
                <!-- Main Container -->
                <table role="presentation" class="container-table" border="0" cellpadding="0" cellspacing="0" width="560" style="max-width: 560px; width: 100%; margin: 0 auto;">
                    
                    <!-- Header Branding -->
                    <tr>
                        <td align="center" style="padding-bottom: 24px;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <!-- Brand Icon Badge -->
                                        @php
                                            $logoPath = public_path('images/logo.png');
                                            $logoSrc = (isset($message) && file_exists($logoPath))
                                                ? $message->embed($logoPath)
                                                : rtrim(config('app.frontend_url', 'http://localhost:5173'), '/') . '/images/logo.png';
                                        @endphp
                                        <img src="{{ $logoSrc }}" width="56" height="56" alt="{{ __('emails.platform_name') }}" style="display: block; width: 56px; height: 56px; border-radius: 14px; border: 0; outline: none; text-decoration: none; margin: 0 auto; box-shadow: 0 4px 12px rgba(0, 51, 102, 0.22);" />
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-top: 12px;">
                                        <span style="font-size: 17px; font-weight: 700; color: #003366; display: block; letter-spacing: -0.2px; line-height: 1.3;">
                                            {{ __('emails.platform_name') }}
                                        </span>
                                        <span style="font-size: 13px; color: #64748b; display: block; margin-top: 3px;">
                                            {{ __('emails.platform_subtitle') }}
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Email Card Box -->
                    <tr>
                        <td>
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.02); overflow: hidden;">
                                <!-- Top Accent Banner Line -->
                                <tr>
                                    <td style="height: 4px; background: linear-gradient(90deg, #003366 0%, #0284c7 50%, #10b981 100%);"></td>
                                </tr>
                                
                                <!-- Card Main Content -->
                                <tr>
                                    <td class="card-content" style="padding: 36px 32px; direction: {{ ($locale ?? app()->getLocale()) === 'ar' ? 'rtl' : 'ltr' }}; text-align: {{ ($locale ?? app()->getLocale()) === 'ar' ? 'right' : 'left' }};">
                                        @yield('content')
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding-top: 28px; direction: {{ ($locale ?? app()->getLocale()) === 'ar' ? 'rtl' : 'ltr' }}; text-align: center;">
                            <p style="margin: 0 0 6px 0; font-size: 12px; color: #94a3b8;">
                                {{ __('emails.security_notice') }}
                            </p>
                            <p style="margin: 0 0 12px 0; font-size: 12px; color: #94a3b8;">
                                {{ __('emails.support_contact') }}
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #cbd5e1; font-weight: 500;">
                                &copy; {{ date('Y') }} {{ __('emails.platform_name') }}. {{ __('emails.all_rights_reserved') }}
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
