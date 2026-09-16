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
        Schema::create('opportunities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->restrictOnDelete();
            $table->foreignId('training_cycle_id')->nullable()->constrained('training_cycles')->nullOnDelete();
            $table->json('title');
            $table->json('department')->nullable();
            $table->json('description');
            $table->foreignId('opportunity_type_id')->constrained('opportunity_types')->restrictOnDelete();
            $table->enum('work_mode', ['full_time', 'part_time', 'remote', 'hybrid'])->default('full_time');
            $table->string('location')->nullable();
            $table->string('duration')->nullable();
            $table->unsignedSmallInteger('capacity')->default(1);
            $table->unsignedSmallInteger('accepted_count')->default(0);
            $table->decimal('salary', 10, 2)->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->timestamp('application_deadline')->nullable();
            $table->enum('status', ['draft', 'published', 'closed', 'completed', 'archived'])->default('draft');
            $table->unsignedInteger('version')->default(1);
            $table->timestamp('published_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'training_cycle_id']);
            $table->index('company_id');
            $table->index('opportunity_type_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('opportunities');
    }
};
