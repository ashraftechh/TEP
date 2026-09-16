<?php

declare(strict_types=1);

namespace App\Http\Requests\Opportunities;

use Illuminate\Foundation\Http\FormRequest;

class SearchOpportunitiesRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:255'],
            'major_id' => ['nullable', 'integer', 'exists:majors,id'],
            'skill_id' => ['nullable', 'integer', 'exists:skills,id'],
            'opportunity_type_id' => ['nullable', 'integer', 'exists:opportunity_types,id'],
            'is_remote' => ['nullable', 'boolean'],
            'location' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'in:draft,published,closed,completed,archived'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
