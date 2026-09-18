<?php

declare(strict_types=1);

return [
    'fetched_successfully' => 'تم استرجاع سجلات الحضور بنجاح.',
    'recorded_successfully' => 'تم تسجيل الحضور بنجاح.',
    'approved_successfully' => 'تمت الموافقة على سجل الحضور بنجاح.',
    'rejected_successfully' => 'تم رفض سجل الحضور بنجاح.',
    'already_recorded' => 'تم تسجيل الحضور لهذا الطالب بالفعل في هذا التاريخ المحدد.',
    'assignment_not_active' => 'لا يمكن تسجيل الحضور. التدريب الميداني غير نشط.',
    'not_reviewable' => 'تم اتخاذ قرار بشأن سجل الحضور هذا بالفعل ولا يمكن مراجعته مرة أخرى.',

    'status' => [
        'present' => 'حاضر',
        'absent' => 'غائب',
        'late' => 'متأخر',
        'excused' => 'معذور',
    ],

    'approval_status' => [
        'all' => 'الكل',
        'pending' => 'قيد الاعتماد',
        'approved' => 'معتمد',
        'rejected' => 'مرفوض',
    ],

    'validation' => [
        'reason_required_for_non_present' => 'السبب مطلوب في حال عدم حضور الطالب.',
        'rejection_reason_required' => 'سبب الرفض مطلوب.',
        'date_cannot_be_future' => 'لا يمكن أن يكون تاريخ الحضور في المستقبل.',
    ],

    'filament' => [
        'resource' => [
            'title' => 'سجلات الحضور',
            'singular' => 'سجل حضور',
            'navigation_group' => 'إدارة التدريب والمتابعة',
        ],
        'columns' => [
            'student' => 'الطالب',
            'student_number' => 'رقم الطالب',
            'company' => 'الشركة',
            'date' => 'تاريخ الحضور',
            'status' => 'الحالة',
            'reason' => 'السبب',
            'approval_status' => 'حالة الاعتماد',
            'recorded_by' => 'تم التسجيل بواسطة',
            'approved_by' => 'تم الاعتماد بواسطة',
            'approved_at' => 'تاريخ الاعتماد',
        ],
        'actions' => [
            'approve' => [
                'label' => 'اعتماد',
                'modal_heading' => 'اعتماد سجل الحضور',
                'modal_description' => 'هل أنت متأكد من رغبتك في اعتماد سجل الحضور هذا؟',
                'success_notification' => 'تم اعتماد سجل الحضور بنجاح.',
            ],
            'reject' => [
                'label' => 'رفض',
                'modal_heading' => 'رفض سجل الحضور',
                'modal_description' => 'يرجى تقديم سبب لرفض سجل الحضور هذا.',
                'reason_label' => 'سبب الرفض',
                'reason_placeholder' => 'اكتب سبب رفض سجل الحضور...',
                'success_notification' => 'تم رفض سجل الحضور بنجاح.',
            ],
        ],
    ],
];
