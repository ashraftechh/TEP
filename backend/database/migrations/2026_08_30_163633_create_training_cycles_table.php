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
        Schema::create('training_cycles', function (Blueprint $table) {
            $table->id();
            $table->json('name');
            $table->string('academic_year', 20);
            $table->string('semester', 30)->nullable();
            $table->timestamp('application_start_at')->nullable();
            $table->timestamp('application_end_at')->nullable();
            $table->date('end_date')->nullable();
            $table->enum('status', ['draft', 'active', 'closed', 'archived'])->default('draft');
            $table->timestamps();

            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('training_cycles');
    }
};
