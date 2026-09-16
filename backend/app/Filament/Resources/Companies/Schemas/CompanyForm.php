<?php

declare(strict_types=1);

namespace App\Filament\Resources\Companies\Schemas;

use App\Models\Industry;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Schema;

class CompanyForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Grid::make(2)->schema([
                    TextInput::make('name.ar')
                        ->label(__('companies.columns.name').' (العربية)')
                        ->required()
                        ->maxLength(255),

                    TextInput::make('name.en')
                        ->label(__('companies.columns.name').' (English)')
                        ->required()
                        ->maxLength(255),

                    TextInput::make('contact_email')
                        ->label(__('companies.columns.contact_email'))
                        ->email()
                        ->required()
                        ->maxLength(255),

                    TextInput::make('phone')
                        ->label(__('companies.columns.phone'))
                        ->tel()
                        ->maxLength(30),

                    Select::make('industry_id')
                        ->label(__('companies.columns.industry'))
                        ->options(fn () => Industry::where('is_active', true)->get()->mapWithKeys(fn (Industry $ind) => [
                            $ind->id => $ind->getTranslation('name', app()->getLocale()) ?: $ind->name,
                        ]))
                        ->searchable()
                        ->preload(),

                    TextInput::make('registration_number')
                        ->label(__('companies.columns.registration_number'))
                        ->maxLength(100),

                    TextInput::make('website')
                        ->label(__('companies.columns.website'))
                        ->url()
                        ->maxLength(255),

                    TextInput::make('city')
                        ->label('المدينة / City')
                        ->maxLength(100),
                ]),

                Textarea::make('description.ar')
                    ->label(__('companies.columns.description').' (العربية)')
                    ->rows(3),

                Textarea::make('description.en')
                    ->label(__('companies.columns.description').' (English)')
                    ->rows(3),
            ]);
    }
}
