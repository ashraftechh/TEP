<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->json('name');
            $table->string('registration_number')->nullable()->unique();
            $table->foreignId('industry_id')->nullable()->constrained('industries')->nullOnDelete();
            $table->json('description')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('phone', 20)->nullable();
            $table->string('website')->nullable();
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->unsignedSmallInteger('established_year')->nullable();
            $table->string('employees_count', 20)->nullable();
            $table->foreignId('logo_file_id')->nullable()->constrained('files')->nullOnDelete();
            $table->enum('status', [
                'pending_verification',
                'under_review',
                'approved',
                'rejected',
                'changes_requested',
                'suspended',
            ])->default('pending_verification');
            $table->text('status_reason')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('companies');
    }
};
