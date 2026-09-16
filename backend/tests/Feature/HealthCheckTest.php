<?php

declare(strict_types=1);

namespace Tests\Feature;

use Tests\TestCase;

/**
 * Smoke tests for GET /api/v1/health.
 *
 * These intentionally hit the real test database (no mocking) to verify
 * the full health check pipeline works end to end. No RefreshDatabase
 * trait is needed because the endpoint only reads — it never writes.
 */
class HealthCheckTest extends TestCase
{
    /**
     * A healthy environment should return 200 with status "ok"
     * and the expected JSON structure.
     */
    public function test_health_endpoint_returns_ok_when_healthy(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response
            ->assertOk()
            ->assertJsonStructure([
                'status',
                'checks' => [
                    'database',
                    'cache',
                    'queue',
                ],
                'timestamp',
            ])
            ->assertJson([
                'status' => 'ok',
            ]);
    }

    /**
     * The health route must be publicly accessible — no auth required.
     *
     * If someone accidentally wraps this route in auth:sanctum middleware,
     * this test will fail with a 401/403 instead of 200.
     */
    public function test_health_endpoint_is_publicly_accessible(): void
    {
        // Deliberately send NO authentication headers whatsoever.
        $response = $this->getJson('/api/v1/health');

        $response->assertOk();
    }
}
