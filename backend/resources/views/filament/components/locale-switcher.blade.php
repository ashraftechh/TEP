@php
    $currentLocale = app()->getLocale();
    $targetLocale = $currentLocale === 'ar' ? 'en' : 'ar';
    $label = $currentLocale === 'ar' ? 'English' : 'العربية';
@endphp

<div style="display: flex; align-items: center; margin-inline-end: 0.75rem;">
    <a href="{{ route('filament.switch-locale', $targetLocale) }}"
        style="
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            font-size: 12px;
            font-weight: 600;
            color: inherit;
            background: rgba(125, 125, 125, 0.12);
            border-radius: 8px;
            text-decoration: none;
            transition: background 0.15s ease;
            cursor: pointer;
        "
        onmouseover="this.style.background='rgba(125, 125, 125, 0.22)'"
        onmouseout="this.style.background='rgba(125, 125, 125, 0.12)'"
        title="{{ $currentLocale === 'ar' ? 'Switch to English' : 'التحويل إلى العربية' }}">
        <span>{{ $label }}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            style="flex-shrink: 0;">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
    </a>
</div>
