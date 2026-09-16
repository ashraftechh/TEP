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
        Schema::create('files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('uploader_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('fileable_type')->nullable();
            $table->unsignedBigInteger('fileable_id')->nullable();
            $table->string('purpose', 50);
            $table->string('disk', 30)->default('s3');
            $table->string('path')->comment('Storage path/key on the disk.');
            $table->string('original_name');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size_bytes');
            $table->string('checksum', 128)->nullable();
            $table->enum('scan_status', ['pending', 'clean', 'infected', 'failed'])->default('pending');
            $table->timestamp('scanned_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['fileable_type', 'fileable_id']);
            $table->index('purpose');
            $table->index('scan_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('files');
    }
};
