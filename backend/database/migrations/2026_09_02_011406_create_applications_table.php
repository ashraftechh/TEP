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
        Schema::create('applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('opportunity_id')->constrained()->restrictOnDelete();
            $table->foreignId('student_profile_id')->constrained()->restrictOnDelete();
            $table->text('cover_note')->nullable();
            $table->foreignId('cv_file_id')->nullable()->constrained('files')->nullOnDelete();
            $table->enum('status', [
                'submitted', 'under_review', 'interview_scheduled',
                'accepted', 'rejected', 'withdrawn',
            ])->default('submitted');
            $table->timestamp('interview_at')->nullable();
            $table->text('decision_reason')->nullable();
            $table->text('withdrawn_reason')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['student_profile_id', 'opportunity_id']);
            $table->index(['opportunity_id', 'status']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('applications');
    }
};
