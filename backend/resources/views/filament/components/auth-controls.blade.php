@php
    $currentLocale = app()->getLocale();
    $targetLocale = $currentLocale === 'ar' ? 'en' : 'ar';
    $label = $currentLocale === 'ar' ? 'English' : 'العربية';
@endphp

<style>
    .auth-controls-container {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin: 12px 0 8px 0;
        width: 100%;
    }

    .auth-control-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 6px 14px;
        font-size: 12px;
        font-weight: 600;
        color: inherit;
        background: rgba(125, 125, 125, 0.1);
        border: 1px solid rgba(125, 125, 125, 0.15);
        border-radius: 8px;
        text-decoration: none;
        cursor: pointer;
        transition: background 0.15s ease, border-color 0.15s ease;
        line-height: 1.5;
    }

    .auth-control-btn:hover {
        background: rgba(125, 125, 125, 0.2);
        border-color: rgba(125, 125, 125, 0.3);
    }

    .theme-toggle-btn .sun-icon {
        display: none;
    }

    .theme-toggle-btn .moon-icon {
        display: block;
    }

    html.dark .theme-toggle-btn .sun-icon {
        display: block !important;
    }

    html.dark .theme-toggle-btn .moon-icon {
        display: none !important;
    }
</style>

<div class="auth-controls-container">
    {{-- Language Switcher --}}
    <a href="{{ route('filament.switch-locale', $targetLocale) }}" class="auth-control-btn"
        title="{{ $currentLocale === 'ar' ? 'Switch to English' : 'التحويل إلى العربية' }}">
        <span>{{ $label }}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
    </a>

    {{-- Dark Mode Toggle (Single icon shown at a time) --}}
    <button type="button"
        onclick="
            const isDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            window.dispatchEvent(new CustomEvent('theme-changed', { detail: isDark ? 'dark' : 'light' }));
        "
        class="auth-control-btn theme-toggle-btn"
        title="{{ $currentLocale === 'ar' ? 'تبديل الوضع الليلي' : 'Toggle Dark Mode' }}">
        {{-- Sun icon (shown only when dark mode is active) --}}
        <svg class="sun-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
        {{-- Moon icon (shown only when light mode is active) --}}
        <svg class="moon-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
    </button>
</div>
