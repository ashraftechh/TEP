<?php

declare(strict_types=1);

namespace App\Actions\Companies;

use App\Models\Company;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;

class GenerateCompanyJoinInvite
{
    /**
     * Generate a temporary signed invitation URL for a user to join a company as a representative.
     *
     * @param  Company  $company  The company to join.
     * @param  string  $email  The email address of the invited representative.
     * @param  int  $validDays  The number of days the signed invitation link is valid for (default 7).
     * @return string The signed frontend URL.
     */
    public function execute(Company $company, string $email, int $validDays = 7): string
    {
        $backendSignedUrl = URL::temporarySignedRoute(
            'company.join',
            now()->addDays($validDays),
            [
                'company' => $company->id,
                'email' => $email,
            ]
        );

        $parsed = parse_url($backendSignedUrl);
        $frontendBase = rtrim(Config::string('app.frontend_url', 'http://localhost:5173'), '/');

        return $frontendBase.'/companies/join/'.$company->id.'?'.($parsed['query'] ?? '');
    }
}
