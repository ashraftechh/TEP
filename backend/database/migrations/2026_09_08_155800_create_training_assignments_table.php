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
        Schema::create('training_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('application_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('student_profile_id')->constrained()->restrictOnDelete();
            $table->foreignId('company_id')->constrained()->restrictOnDelete();
            $table->foreignId('opportunity_id')->constrained()->restrictOnDelete();
            $table->foreignId('academic_supervisor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('field_supervisor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('training_coordinator_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', ['active', 'suspended', 'completed', 'terminated'])
                ->default('active');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->unsignedTinyInteger('progress_percentage')->default(0);
            $table->unsignedTinyInteger('required_reports_count')->nullable();
            $table->json('report_configuration')->nullable();
            $table->text('suspension_reason')->nullable();
            $table->text('termination_reason')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('academic_supervisor_id');
            $table->index('company_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('training_assignments');
    }
};
