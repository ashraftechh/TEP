<?php

declare(strict_types=1);

return [
    // Eligibility errors
    'opportunity_not_published' => 'هذه الفرصة التدريبية لا تقبل الطلبات حالياً.',
    'deadline_passed' => 'انتهى الموعد النهائي لتقديم الطلبات لهذه الفرصة.',
    'opportunity_at_capacity' => 'بلغت هذه الفرصة الحد الأقصى من الطلاب المقبولين. لم تعد تقبل طلبات جديدة.',
    'already_applied' => 'لديك بالفعل طلب نشط مقدَّم لهذه الفرصة.',
    'student_already_assigned' => 'لديك تدريب تعاوني نشط أو معلق حالياً ولا يمكنك التقديم على فرص جديدة.',
    'active_cap_reached' => 'لقد وصلت إلى الحد الأقصى البالغ :cap طلبات نشطة متزامنة (الحالية: :count). يجب سحب أحد طلباتك أو انتظار قرار بشأنه قبل التقديم على فرصة جديدة.',

    // General application messages
    'submitted_successfully' => 'تم تقديم طلبك بنجاح.',
    'withdrawn_successfully' => 'تم سحب طلبك بنجاح.',
    'withdrawn_due_to_other_assignment' => 'تم السحب تلقائيًا بسبب تعيين الطالب في فرصة تدريبية أخرى.',
    'not_found' => 'الطلب غير موجود.',
    'cannot_withdraw' => 'لا يمكن سحب هذا الطلب من حالته الحالية.',
    'version_mismatch' => 'تم تعديل هذا الطلب بواسطة عملية أخرى. يرجى إعادة التحميل قبل المحاولة مرة أخرى.',
    'decision_recorded' => 'تم تسجيل القرار بنجاح.',
    'list_fetched' => 'تم استرجاع الطلبات بنجاح.',

    // Accept / Reject
    'cannot_accept' => 'لا يمكن قبول هذا الطلب من حالته الحالية.',
    'cannot_reject' => 'لا يمكن رفض هذا الطلب من حالته الحالية.',
    'capacity_reached' => 'بلغت هذه الفرصة الحد الأقصى من الطلاب المقبولين بالفعل.',

    // Schedule Interview
    'cannot_schedule_interview' => 'لا يمكن جدولة مقابلة لهذا الطلب من حالته الحالية.',
    'interview_scheduled_successfully' => 'تم جدولة المقابلة بنجاح.',

    // Company applications review
    'company_not_found' => 'لا توجد شركة مرتبطة بحسابك.',
    'cannot_review' => 'لا يمكن وضع هذا الطلب قيد المراجعة من حالته الحالية.',
    'review_started_successfully' => 'أصبح الطلب قيد المراجعة الآن.',

    // Transition history
    'transitions_fetched' => 'تم استرجاع سجل الطلب بنجاح.',
];
