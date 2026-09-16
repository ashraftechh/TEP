<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;

/**
 * Public health check endpoint for monitoring tools and CI smoke tests.
 *
 * Reports real-time connectivity status of critical dependencies
 * without exposing any internal error details.
 */
class HealthController extends Controller
{
    /**
     * Run all health checks and return aggregated status.
     */
    public function check(): JsonResponse
    {
        $checks = [
            'database' => $this->checkDatabase(),
            'cache' => $this->checkCache(),
            'queue' => $this->checkQueue(),
        ];

        $allHealthy = ! in_array('failed', $checks, true);

        return response()->json([
            'status' => $allHealthy ? 'ok' : 'degraded',
            'checks' => $checks,
            'timestamp' => now()->toIso8601ZuluString(),
        ], $allHealthy ? 200 : 503);
    }

    /**
     * Verify database connectivity with a trivial query.
     */
    private function checkDatabase(): string
    {
        try {
            DB::select('SELECT 1');

            return 'ok';
        } catch (\Throwable) {
            return 'failed';
        }
    }

    /**
     * Verify cache driver connectivity by writing and reading back a throwaway key.
     */
    private function checkCache(): string
    {
        try {
            $key = 'health_check_'.bin2hex(random_bytes(8));
            Cache::put($key, 'ok', 5);
            $value = Cache::get($key);
            Cache::forget($key);

            return $value === 'ok' ? 'ok' : 'failed';
        } catch (\Throwable) {
            return 'failed';
        }
    }

    /**
     * Verify the configured queue connection is reachable.
     *
     * Uses Queue::size() as a lightweight probe — it contacts the queue
     * backend without dispatching or processing any real job.
     */
    private function checkQueue(): string
    {
        try {
            Queue::size();

            return 'ok';
        } catch (\Throwable) {
            return 'failed';
        }
    }
}
