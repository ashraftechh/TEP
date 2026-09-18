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
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_assignment_id')->constrained()->restrictOnDelete();
            $table->string('title');
            $table->foreignId('report_type_id')->constrained('report_types')->restrictOnDelete();
            $table->unsignedSmallInteger('report_number')->nullable();
            $table->longText('content')->nullable();
            $table->enum('status', [
                'draft', 'submitted', 'under_review',
                'approved', 'revision_requested', 'rejected',
            ])->default('draft');
            $table->decimal('grade', 5, 2)->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamp('submitted_at')->nullable()->default(null);
            $table->timestamp('due_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['training_assignment_id', 'status']);
            $table->index(['training_assignment_id', 'report_type_id']);
            $table->index('due_at');

            $table->unique(
                ['training_assignment_id', 'report_type_id', 'report_number'],
                'reports_assignment_type_number_unique'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
