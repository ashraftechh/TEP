<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\File;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FileController extends Controller
{
    /**
     * Upload a generic file (e.g. CV document, image, or attachment).
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:pdf,doc,docx,jpeg,png,jpg,webp,zip', 'max:10240'],
            'purpose' => ['nullable', 'string', 'max:50'],
        ]);

        /** @var User $user */
        $user = $request->user();
        $uploadedFile = $request->file('file');
        $purpose = (string) $request->input('purpose', 'document');

        $folder = match ($purpose) {
            'cv' => 'cvs',
            'avatar' => 'avatars',
            'logo' => 'company_logos',
            'report_attachment' => 'report_attachments',
            default => 'documents',
        };

        $path = $uploadedFile->store($folder, 'public');

        $file = File::create([
            'uploader_id' => $user->id,
            'fileable_type' => User::class,
            'fileable_id' => $user->id,
            'purpose' => $purpose,
            'disk' => 'public',
            'path' => $path,
            'original_name' => $uploadedFile->getClientOriginalName(),
            'mime_type' => $uploadedFile->getMimeType() ?? 'application/octet-stream',
            'size_bytes' => $uploadedFile->getSize(),
            'scan_status' => 'clean',
            'scanned_at' => now(),
        ]);

        return response()->json([
            'data' => [
                'id' => $file->id,
                'original_name' => $file->original_name,
                'url' => $file->url,
                'mime_type' => $file->mime_type,
                'size_bytes' => $file->size_bytes,
                'purpose' => $file->purpose,
            ],
            'message' => __('files.uploaded_successfully', [
                'default' => 'File uploaded successfully.',
            ]),
        ], 201);
    }
}
