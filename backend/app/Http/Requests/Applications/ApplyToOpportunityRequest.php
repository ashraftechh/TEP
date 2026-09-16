<?php

declare(strict_types=1);

namespace App\Http\Requests\Applications;

use App\Models\File;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class ApplyToOpportunityRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user) {
            return false;
        }

        return $user->hasPermission('applications.own.create') && $user->studentProfile !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'cv_file_id' => ['required', 'integer', 'exists:files,id'],
            'cover_note' => ['nullable', 'string', 'max:3000'],
        ];
    }

    /**
     * Configure the validator instance with additional business validation.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $cvFileId = $this->input('cv_file_id');

            if ($cvFileId && ! $v->errors()->has('cv_file_id')) {
                $user = $this->user();
                $file = File::find($cvFileId);

                // Ensure the file exists and is owned by the authenticated student
                if (! $file || $file->uploader_id !== $user?->id) {
                    $v->errors()->add(
                        'cv_file_id',
                        __('files.unauthorized_file', [
                            'default' => 'The selected CV file does not belong to your account.',
                        ])
                    );
                }
            }
        });
    }

    /**
     * Custom translated attribute names.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'cv_file_id' => __('validation.attributes.cv_file_id', ['default' => 'CV file']),
            'cover_note' => __('validation.attributes.cover_note', ['default' => 'cover note']),
        ];
    }
}
