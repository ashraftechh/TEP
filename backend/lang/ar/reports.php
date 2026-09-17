<?php

declare(strict_types=1);

return [
    'created_successfully' => 'تم إنشاء مسودة التقرير بنجاح.',
    'updated_successfully' => 'تم تحديث التقرير بنجاح.',
    'submitted_successfully' => 'تم إرسال التقرير بنجاح.',
    'no_active_assignment' => 'يجب أن يكون لديك تدريب ميداني نشط لإنشاء تقرير.',
    'duplicate_report' => 'يوجد بالفعل تقرير بهذا النوع والرقم لتدريبك الميداني.',
    'duplicate_final_report' => 'يوجد بالفعل تقرير نهائي لتدريبك الميداني.',
    'not_editable' => 'لم يعد بالإمكان تعديل هذا التقرير.',
    'not_submittable' => 'لا يمكن إرسال تقرير ليس في حالة مسودة أو طلب تعديل.',
    'reviewed_successfully' => 'تمت مراجعة التقرير بنجاح.',
    'not_reviewable' => 'لا يمكن مراجعة هذا التقرير في حالته الحالية.',
    'training_completed' => 'اكتمل تدريبك (تم اعتماد التقرير النهائي). لا يمكن إنشاء تقارير جديدة أو إرسالها.',
    'report_type_not_allowed' => 'نوع التقرير هذا غير مفعل لهذا التدريب الميداني.',
    'report_quota_exceeded' => 'لقد وصلت إلى الحد الأقصى المسموح به من التقارير لهذا النوع أو التدريب.',
    'report_sequence_not_met' => 'يجب إكمال جميع تقارير :prerequisite_type واعتمادها قبل إنشاء تقرير :type.',

    'validation' => [
        'feedback_required' => 'الملاحظات مطلوبة.',
        'feedback_required_reject' => 'يجب إبداء سبب لرفض التقرير.',
        'feedback_required_revision' => 'يجب إبداء سبب لطلب تعديل التقرير.',
        'grade_required_on_approval' => 'الدرجة مطلوبة عند اعتماد التقرير.',
    ],

    'status' => [
        'draft' => 'مسودة',
        'submitted' => 'مرسل',
        'under_review' => 'قيد المراجعة',
        'approved' => 'معتمد',
        'revision_requested' => 'مطلوب تعديل',
        'rejected' => 'مرفوض',
    ],
];