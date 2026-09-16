@php
    $locale = app()->getLocale();
    $isAr = $locale === 'ar';
@endphp

<div class="filament-brand-logo" style="display: inline-flex; align-items: center; gap: 12px; text-decoration: none;" dir="{{ $isAr ? 'rtl' : 'ltr' }}">
    <!-- Brand Icon / Lettermark Badge (matches React Logo.tsx size='md') -->
    <div style="display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; background-color: #003366; color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); flex-shrink: 0;">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/>
            <path d="M22 10v6"/>
            <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>
        </svg>
    </div>

    <!-- Brand Platform & University Text (matches React Logo.tsx text hierarchy) -->
    <div style="text-align: {{ $isAr ? 'right' : 'left' }}; line-height: 1.25;">
        <span style="display: block; font-weight: 700; font-size: 15px; color: inherit; letter-spacing: -0.015em;">
            {{ $isAr ? 'منصة التدريب التعاوني' : 'Cooperative Training Platform' }}
        </span>
        <span style="display: block; font-size: 12px; font-weight: 400; color: #64748b; margin-top: 2px;">
            {{ $isAr ? 'جامعة إقليم سبأ' : 'Saba Region University' }}
        </span>
    </div>
</div>
