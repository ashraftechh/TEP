<?php

declare(strict_types=1);

return [
    'created_successfully' => 'تم إنشاء التكليف التدريبي بنجاح.',
    'updated_successfully' => 'تم تحديث التكليف التدريبي بنجاح.',
    'fetched_successfully' => 'تم استرجاع التكليف التدريبي بنجاح.',
    'transitioned_successfully' => 'تم تحديث حالة التكليف التدريبي بنجاح.',
    'no_active_assignment' => 'ليس لديك تدريب فعلي حتى الآن.',
    'cannot_create_from_status' => 'لا يمكن إنشاء تكليف تدريبي إلا من طلب مقبول.',
    'already_exists' => 'يوجد بالفعل تكليف تدريبي لهذا الطلب.',
    'student_already_assigned' => 'هذا الطالب لديه تكليف تدريبي نشط أو موقوف بالفعل.',
    'invalid_transition' => 'لا يمكن تغيير حالة التكليف التدريبي من :from إلى :to.',

    'validation' => [
        'user_missing_role' => 'المستخدم المحدد لا يحمل صلاحية :role.',
        'field_supervisor_wrong_company' => 'يجب أن ينتمي المشرف الميداني المحدد إلى نفس الشركة صاحبة الفرصة التدريبية.',
        'reason_required' => 'السبب مطلوب عند إيقاف أو إنهاء التكليف التدريبي.',
    ],

    'resource' => [
        'title' => 'التكليفات التدريبية',
        'singular' => 'تكليف تدريبي',
        'navigation_group' => 'إدارة التدريب والمتابعة',
    ],

    'form' => [
        'application' => 'طلب مقبول',
        'academic_supervisor' => 'المشرف الأكاديمي',
        'field_supervisor' => 'المشرف الميداني',
        'field_supervisor_hint' => 'اختياري — اختر طلبًا مقبولًا أولاً؛ سيتم عرض ممثلي شركة الفرصة التدريبية فقط.',
        'start_date' => 'تاريخ البدء',
        'end_date' => 'تاريخ الانتهاء',
        'required_reports_count' => 'إجمالي التقارير المطلوبة',
        'report_configuration_section' => 'متطلبات وجدولة التقارير',
        'duration_summary' => 'المدة المحسوبة: :days يوم (:weeks أسبوع، :months شهر)',
        'enable_daily_reports' => 'تفعيل التقارير اليومية',
        'daily_reports_count' => 'عدد التقارير اليومية',
        'enable_weekly_reports' => 'تفعيل التقارير الأسبوعية',
        'weekly_reports_count' => 'عدد التقارير الأسبوعية',
        'enable_monthly_reports' => 'تفعيل التقارير الشهرية',
        'monthly_reports_count' => 'عدد التقارير الشهرية',
        'require_final_report' => 'طلب تقرير نهائي',
        'required_reports_calculated_hint' => 'محسوبة تلقائيًا بناءً على خيارات وأعداد التقارير المفعلة أعلاه.',
        'filter_section' => 'تصفية الطلبات',
        'filter_section_hint' => 'استخدم خيارات التصفية لتضييق قائمة الطلبات أدناه.',
        'filter_by_company' => 'تصفية حسب الشركة',
        'filter_by_opportunity' => 'تصفية حسب الفرصة',
        'filter_by_student' => 'تصفية حسب الطالب',
        'all_companies' => 'جميع الشركات',
        'all_opportunities' => 'جميع الفرص',
        'all_students' => 'جميع الطلاب',
    ],

    'columns' => [
        'student' => 'الطالب',
        'company' => 'الشركة',
        'academic_supervisor' => 'المشرف الأكاديمي',
        'field_supervisor' => 'المشرف الميداني',
        'status' => 'الحالة',
        'start_date' => 'تاريخ البدء',
        'end_date' => 'تاريخ الانتهاء',
        'progress' => 'نسبة الإنجاز',
    ],

    'infolist' => [
        'student_section' => 'معلومات الطالب',
        'placement_section' => 'جهة وفرصة التدريب',
        'supervisors_section' => 'الإشراف والتنسيق',
        'report_config_section' => 'متطلبات وجدولة التقارير',
        'reports_summary' => 'تفصيل التقارير',
        'student_number' => 'الرقم الجامعي',
        'major' => 'التخصص',
        'university' => 'الجامعة',
        'opportunity' => 'الفرصة التدريبية',
        'coordinator' => 'منسق التدريب',
        'daily_reports' => 'التقارير اليومية',
        'weekly_reports' => 'التقارير الأسبوعية',
        'monthly_reports' => 'التقارير الشهرية',
        'final_report' => 'التقرير النهائي',
        'enabled' => 'مفعّل',
        'disabled' => 'معطّل',
    ],

    'statuses' => [
        'active' => 'نشط',
        'suspended' => 'متوقف',
        'completed' => 'مكتمل',
        'terminated' => 'منهي',
    ],

    'actions' => [
        'create' => 'إنشاء تكليف تدريبي',
        'edit' => [
            'label' => 'تعديل',
            'modal_heading' => 'تعديل التكليف التدريبي',
        ],
        'view_details' => [
            'label' => 'عرض التفاصيل',
            'modal_heading' => 'تفاصيل التكليف التدريبي',
        ],
        'view' => 'عرض',
        'suspend' => [
            'label' => 'إيقاف',
            'modal_heading' => 'إيقاف التكليف التدريبي',
            'modal_description' => 'سيتم إشعار الطالب والمشرف الميداني. يمكن التراجع عن هذا لاحقًا باستخدام "إعادة التفعيل".',
            'reason_label' => 'سبب الإيقاف',
            'reason_placeholder' => 'اشرح سبب إيقاف هذا التكليف التدريبي...',
            'success_notification' => 'تم إيقاف التكليف التدريبي.',
        ],
        'terminate' => [
            'label' => 'إنهاء',
            'modal_heading' => 'إنهاء التكليف التدريبي',
            'modal_description' => 'هذا الإجراء ينهي التدريب بشكل نهائي ولا يمكن التراجع عنه.',
            'reason_label' => 'سبب الإنهاء',
            'reason_placeholder' => 'اشرح سبب إنهاء هذا التكليف التدريبي...',
            'success_notification' => 'تم إنهاء التكليف التدريبي.',
        ],
        'reactivate' => [
            'label' => 'إعادة التفعيل',
            'modal_heading' => 'إعادة تفعيل التكليف التدريبي',
            'modal_description' => 'سيؤدي هذا إلى استئناف التدريب الموقوف.',
            'success_notification' => 'تمت إعادة تفعيل التكليف التدريبي.',
        ],
        'mark_completed' => [
            'label' => 'وضع علامة مكتمل',
            'modal_heading' => 'وضع علامة اكتمال على التكليف التدريبي',
            'modal_description' => 'يشير هذا إلى انتهاء التدريب. هذه الحالة نهائية ولا يمكن تغييرها لاحقًا.',
            'success_notification' => 'تم وضع علامة اكتمال على التكليف التدريبي.',
        ],
    ],
];
