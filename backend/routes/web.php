<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/admin/switch-locale/{locale}', function (string $locale) {
    if (in_array($locale, ['ar', 'en'], true)) {
        session(['filament_locale' => $locale, 'locale' => $locale]);
        app()->setLocale($locale);
    }

    return redirect()->back();
})->middleware(['web'])->name('filament.switch-locale');
