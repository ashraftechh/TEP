<?php

declare(strict_types=1);

return [
    'request_submitted_successfully' => 'تم تقديم طلب تسجيل الشركة بنجاح، وسيتم مراجعته من قبل إدارة التدريب.',
    'request_already_exists' => 'يوجد طلب تسجيل مسبق لهذه الشركة.',
    'profile_retrieved' => 'تم استرجاع بيانات الشركة بنجاح.',
    'profile_updated_successfully' => 'تم تحديث بيانات الشركة بنجاح.',
    'logo_uploaded_successfully' => 'تم رفع شعار الشركة بنجاح.',
    'no_company' => 'لا توجد شركة مرتبطة بحسابك.',
    'company_suspended' => 'حساب الشركة معلق حالياً. لا يمكن تنفيذ هذا الإجراء.',

    'dashboard' => [
        'title' => 'نظرة عامة',
        'navigation' => 'نظرة عامة',
    ],

    'resource' => [
        'brand_name' => 'منصة التدريب التعاوني | جامعة إقليم سبأ',
        'title' => 'طلبات اعتماد الشركات',
        'singular' => 'طلب اعتماد شركة',
        'navigation_group' => 'الشركات والجهات التدريبية',
        'list_title' => 'قائمة طلبات اعتماد الشركات',
    ],

    'columns' => [
        'name' => 'اسم الشركة',
        'email' => 'البريد الإلكتروني للتواصل',
        'contact_email' => 'البريد الإلكتروني للتواصل مع الشركة',
        'representative_email' => 'البريد الإلكتروني الشخصي للممثل',
        'email_unverified' => 'بريد غير مؤكد',
        'phone' => 'رقم الهاتف',
        'industry' => 'مجال العمل',
        'registration_number' => 'رقم السجل التجاري',
        'status' => 'الحالة',
        'submitted_at' => 'تاريخ التقديم',
        'actions' => 'الإجراءات',
        'website' => 'الموقع الإلكتروني',
        'description' => 'نبذة عن الشركة',
        'representatives' => 'ممثلو الشركة',
        'representative_active' => 'تم التفعيل: :name',
        'representative_pending' => 'بانتظار قبول الدعوة',
        'primary_representative' => 'الممثل الرئيسي',
        'no_representatives' => 'لم يقم أي ممثل بتفعيل الحساب عبر رابط الدعوة بعد.',
    ],

    'statuses' => [
        'pending_verification' => 'قيد التحقق',
        'under_review' => 'قيد المراجعة',
        'approved' => 'معتمدة',
        'rejected' => 'مرفوضة',
        'changes_requested' => 'مطلوب استكمال بيانات',
        'suspended' => 'معلقة',
        'all' => 'الكل',
        'deleted' => 'المحذوفة',
    ],

    'actions' => [
        'approve' => [
            'label' => 'اعتماد الطلب',
            'modal_heading' => 'اعتماد طلب تسجيل الشركة',
            'modal_description' => 'هل أنت متأكد من رغبتك في اعتماد هذه الشركة؟ سيتم إرسال رابط دعوة تفعيل الحساب فورياً إلى البريد الإلكتروني للتواصل.',
            'success_notification' => 'تم اعتماد الشركة بنجاح وإرسال رابط الدعوة إلى البريد الإلكتروني.',
            'success_no_mail_notification' => 'تم اعتماد الشركة بنجاح.',
        ],
        'reject' => [
            'label' => 'رفض / طلب تعديل',
            'modal_heading' => 'قرار بشأن طلب تسجيل الشركة',
            'status_label' => 'نوع القرار',
            'status_options' => [
                'rejected' => 'رفض الطلب',
                'changes_requested' => 'طلب استكمال أو تعديل بيانات',
            ],
            'reason_label' => 'سبب القرار / ملاحظات منسق التدريب',
            'reason_placeholder' => 'اكتب سبب الرفض أو وضح المستندات والبيانات المطلوب استكمالها بدقة...',
            'success_notification' => 'تم تسجيل القرار وإشعار جهة الاتصال بنجاح.',
            'success_no_mail_notification' => 'تم تسجيل القرار بنجاح.',
        ],
        'view_details' => [
            'label' => 'معاينة الطلب',
            'modal_heading' => 'تفاصيل طلب تسجيل الشركة',
            'unverified_email_alert' => 'تنبيه: هذا البريد الإلكتروني غير مؤكد بعد. ستقوم الشركة بإثبات ملكيته عبر رابط الدعوة الموقع عند الاعتماد.',
        ],
        'suspend' => [
            'label' => 'تعليق الشركة',
            'modal_heading' => 'تعليق حساب الشركة',
            'modal_description' => 'هل أنت متأكد من رغبتك في تعليق هذه الشركة؟',
            'reason_label' => 'سبب التعليق',
            'reason_placeholder' => 'اكتب سبب تعليق الشركة...',
            'success_notification' => 'تم تعليق الشركة بنجاح.',
        ],
        'reactivate' => [
            'label' => 'إلغاء التعليق',
            'modal_heading' => 'إلغاء تعليق الشركة',
            'modal_description' => 'هل أنت متأكد من إعادة تفعيل هذه الشركة المعتمدة؟',
            'success_notification' => 'تمت إعادة تفعيل الشركة بنجاح.',
        ],
        'mail_failure' => [
            'title' => 'تعذّر تنفيذ العملية',
            'body' => 'تعذّر إرسال الإشعار البريدي، لذلك لم يتم تغيير الحالة. يُرجى التحقق من اتصال خادم البريد والمحاولة مرة أخرى.',
        ],
    ],

    'representatives_management' => [
        'list_retrieved' => 'تم استرجاع قائمة ممثلي الشركة بنجاح.',
        'invite_sent' => 'تم إرسال رابط الدعوة بنجاح.',
        'updated_successfully' => 'تم تحديث بيانات ممثل الشركة بنجاح.',
        'removed_successfully' => 'تمت إزالة ممثل الشركة بنجاح.',
        'left_successfully' => 'لقد غادرت الشركة بنجاح.',
        'already_representative' => 'هذا المستخدم مسجل بالفعل كممثل لهذه الشركة.',
        'admin_only' => 'هذا الإجراء مخصص للممثل الرئيسي (مدير الحساب) فقط.',
        'not_found' => 'ممثل الشركة غير موجود أو لا ينتمي إلى شركتك.',
        'no_company' => 'لا توجد شركة مرتبطة بحساب الممثل الخاص بك.',
        'mail_failure' => 'تعذّر إرسال البريد الإلكتروني. يُرجى التحقق من اتصال خادم البريد والمحاولة مرة أخرى.',
        'last_representative' => 'لا يمكنك مغادرة الشركة لأنك الممثل الوحيد. أضف ممثلاً آخر أولاً أو تواصل مع الإدارة.',
    ],

    'attributes' => [
        'name_ar' => 'اسم الشركة (بالعربية)',
        'name_en' => 'اسم الشركة (بالإنجليزية)',
        'description_ar' => 'نبذة عن الشركة (بالعربية)',
        'description_en' => 'نبذة عن الشركة (بالإنجليزية)',
        'industry_id' => 'مجال العمل',
        'registration_number' => 'رقم السجل التجاري',
        'email' => 'البريد الإلكتروني للتواصل',
        'phone' => 'رقم الهاتف',
        'website' => 'الموقع الإلكتروني',
        'address' => 'العنوان',
        'city' => 'المدينة',
        'established_year' => 'سنة التأسيس',
        'employees_count' => 'عدد الموظفين',
    ],
];
