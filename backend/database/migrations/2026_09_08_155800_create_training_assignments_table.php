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
            $table->boolean('is_current')->default(true);

            // Enforces "at most one is_current = true row per student" at
            // the database level — application code (see
            // CreateTrainingAssignmentAction) also maintains this, but
            // without this constraint two concurrent create requests for
            // the same student can both pass the app-level check and both
            // write is_current = true. MySQL has no direct "unique index
            // with a WHERE clause" like Postgres, so this is the standard
            // workaround: a stored generated column that is
            // student_profile_id when the row is current and NULL
            // otherwise, with a plain unique index on it. MySQL/MariaDB
            // treat NULL as distinct in a unique index, so any number of
            // non-current rows are fine — only a second is_current = true
            // row for the same student collides.
            $table->unsignedBigInteger('current_student_profile_id')
                ->nullable()
                ->storedAs('CASE WHEN is_current = 1 THEN student_profile_id ELSE NULL END');

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
            $table->index(['student_profile_id', 'is_current']);
            $table->unique('current_student_profile_id', 'training_assignments_one_current_per_student');
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
