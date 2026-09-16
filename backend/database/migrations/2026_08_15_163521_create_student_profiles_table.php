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
        Schema::create('student_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('student_number')->unique();
            $table->foreignId('major_id')->nullable()->constrained('majors')->nullOnDelete();
            $table->string('university_name')->nullable();
            $table->unsignedTinyInteger('level_year')->nullable();
            $table->decimal('gpa', 3, 2)->nullable();
            $table->text('bio')->nullable();
            $table->string('phone', 20)->nullable();
            $table->string('address')->nullable();
            $table->string('expected_graduation', 20)->nullable();
            $table->foreignId('cv_file_id')->nullable()->constrained('files')->nullOnDelete();
            $table->foreignId('avatar_file_id')->nullable()->constrained('files')->nullOnDelete();
            $table->json('interests')->nullable();
            $table->json('languages')->nullable();
            $table->json('achievements')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_profiles');
    }
};
