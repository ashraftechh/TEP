# TEP-537 — قاموس المصطلحات الأساسية للمشروع

> الهدف: توحيد المصطلح بين الوثائق، الواجهة، وأسماء الجداول/الأعمدة في
> قاعدة البيانات، لمنع أي التباس لاحق بين "ما يقوله المستند" و"ما يقوله الكود".
> **يغطي هذا الإصدار الجداول الـ44 الفعلية بالكامل**، وليس فقط النسخة
> الأولى الجزئية.

## الهوية والصلاحيات (Identity & RBAC)

| EN | AR | التعريف | الجدول |
|---|---|---|---|
| User | مستخدم | الحساب الأساسي لأي شخص يسجّل دخوله للنظام | `users` |
| Role | دور | تصنيف صلاحيات (طالب، مشرف أكاديمي...) | `roles` |
| Permission | صلاحية | إجراء محدد مسموح لدور معيّن (مثل `companies.approve`) | `permissions` |
| Role Permission | ربط الدور بالصلاحية | يربط كل دور بصلاحياته | `role_permissions` |
| User Role Assignment | إسناد الدور | يمنح مستخدمًا دورًا، مع نطاق اختياري (scope) | `user_roles` |
| Session | جلسة | جلسة دخول نشطة (Sanctum) | `sessions` |
| SSO Identity | هوية دخول موحّد | ربط حساب مستخدم بمزوّد دخول خارجي (Google/Microsoft)؛ المطابقة عبر `provider_subject_id` الثابت، لا البريد الإلكتروني | `sso_identities` |
| Password Reset Token | رمز إعادة تعيين كلمة المرور | رمز مؤقت لاستعادة كلمة المرور | `password_reset_tokens` |

## الهيكل الأكاديمي (Academic Hierarchy)

| EN | AR | التعريف | الجدول |
|---|---|---|---|
| College | كلية | أعلى مستوى في الهيكل الأكاديمي | `colleges` |
| Department | قسم | يتبع كلية واحدة؛ قد يضم أكثر من تخصص | `departments` |
| Major | تخصص | تخصص أكاديمي للطالب، يتبع قسمًا واحدًا | `majors` |
| Skill | مهارة | مهارة يمتلكها طالب أو تتطلبها فرصة | `skills` |
| Student Profile | الملف الشخصي للطالب | بيانات الطالب الموسّعة (تخصص، سيرة ذاتية...) | `student_profiles` |
| Student Skill | مهارة الطالب | ربط الطالب بمهاراته | `student_skills` |
| Academic Supervisor Profile | ملف المشرف الأكاديمي | يربط المشرف بقسمه الأكاديمي | `academic_supervisor_profiles` |
| Training Coordinator Profile | ملف منسق التدريب | يربط المنسق بقسمه الأكاديمي | `training_coordinator_profiles` |

## الشركات (Companies)

| EN | AR | التعريف | الجدول |
|---|---|---|---|
| Company | شركة | جهة تستضيف تدريبًا، تمر باعتماد قبل النشر | `companies` |
| Company Representative | ممثل شركة | مستخدم يدير حساب شركة | `company_representatives` |
| Industry | قطاع/مجال العمل | تصنيف نشاط الشركة | `industries` |

## الفرص التدريبية (Opportunities)

| EN | AR | التعريف | الجدول |
|---|---|---|---|
| Opportunity | فرصة تدريبية | إعلان تدريب تنشره شركة | `opportunities` |
| Opportunity Type | نوع الفرصة | تصنيف البرنامج (تعاوني، صيفي، تدريب) | `opportunity_types` |
| Opportunity Major | تخصص الفرصة | ربط الفرصة بالتخصصات المناسبة لها | `opportunity_majors` |
| Opportunity Skill | مهارة الفرصة | ربط الفرصة بالمهارات المطلوبة لها | `opportunity_skills` |
| Opportunity Requirement | متطلب الفرصة | متطلب نصي فردي ضمن الفرصة | `opportunity_requirements` |
| Opportunity Benefit | ميزة الفرصة | ميزة نصية فردية تقدمها الفرصة | `opportunity_benefits` |
| Training Cycle | دورة تدريبية | فترة أكاديمية يُنظَّم ضمنها التدريب | `training_cycles` |

## الطلبات والتدريب (Applications & Training)

| EN | AR | التعريف | الجدول |
|---|---|---|---|
| Application | طلب تدريب | تقديم طالب على فرصة | `applications` |
| Application Transition | انتقال حالة الطلب | سجل غير قابل للتعديل لكل تغيير حالة | `application_transitions` |
| Training Assignment | تعيين تدريبي | ربط طالب بفرصة بعد القبول؛ التدريب الفعلي | `training_assignments` |
| Attendance Record | سجل حضور | حضور الطالب ليوم معيّن، يسجّله ممثل الشركة ويعتمده المشرف/المنسق | `attendance_records` |

## التقارير والتقييم (Reports & Evaluation)

| EN | AR | التعريف | الجدول |
|---|---|---|---|
| Report | تقرير تدريبي | تقرير يكتبه الطالب أثناء تدريبه | `reports` |
| Report Type | نوع التقرير | أسبوعي/شهري/نهائي | `report_types` |
| Report Review | مراجعة التقرير | قرار المشرف على تقرير (قبول/رفض/طلب تعديل) | `report_reviews` |
| Evaluation | تقييم | تقييم المشرف الشامل للطالب في نهاية التدريب | `evaluations` |
| Evaluation Criterion | معيار تقييم | معيار ديناميكي قابل للتعديل من لوحة الإدارة، له وزن | `evaluation_criteria` |
| Evaluation Score | درجة المعيار | درجة طالب في معيار واحد ضمن تقييم واحد، مع وزن مجمَّد وقت التسجيل | `evaluation_scores` |

## المراسلة (Messaging)

| EN | AR | التعريف | الجدول |
|---|---|---|---|
| Conversation | محادثة | تواصل بين طرفين مرتبطين بسياق عمل | `conversations` |
| Conversation Participant | مشارك في المحادثة | طرف ضمن محادثة | `conversation_participants` |
| Message | رسالة | رسالة فردية ضمن محادثة | `messages` |
| Message File | ملف مرفق بالرسالة | مرفق ضمن رسالة | `message_files` |

## الملفات والنظام (Files & System)

| EN | AR | التعريف | الجدول |
|---|---|---|---|
| File | ملف | بيانات وصفية لملف مرفوع (المسار الفعلي على S3-compatible storage) | `files` |
| Notification | إشعار | إشعار داخل التطبيق لمستخدم | `notifications` |
| Setting | إعداد | قيمة قابلة للتعديل من لوحة الإدارة (حدود الملفات، اسم الجامعة...) | `settings` |
| Audit Log | سجل تدقيق | سجل غير قابل للتعديل لكل إجراء حساس في النظام | `audit_logs` |

## مصطلحات عابرة للجداول (Cross-Cutting Concepts)

هذه ليست أسماء جداول، لكنها مفاهيم تظهر عبر عدة جداول ويجب فهمها بنفس
المعنى في كل مكان:

| EN | AR | التعريف |
|---|---|---|
| Scope (RBAC) | نطاق الصلاحية | تقييد دور بمورد محدد عبر `scope_type`/`scope_id` في `user_roles`، بدل صلاحية عامة |
| Workflow / Status | سير العمل / الحالة | عمود `status` من نوع ENUM يمثّل مرحلة العنصر ضمن دورة حياة محددة سلفًا (وليس بيانات قابلة للتعديل من لوحة الإدارة) |
| Translatable Content | محتوى قابل للترجمة | عمود JSON عبر `spatie/laravel-translatable`، مثل `{"en":"...","ar":"..."}` — وليس عمودين منفصلين `_ar`/`_en` |
| Lookup Table | جدول مرجعي | جدول قابل للتعديل من لوحة الإدارة (مثل `industries`, `majors`) بعكس قيم ENUM الثابتة في الكود |
| Weight Snapshot | الوزن المجمَّد | نسخة مجمّدة من وزن المعيار وقت تسجيل الدرجة، تحمي التقييمات المنشورة من التغيّر بأثر رجعي عند تعديل الأوزان لاحقًا |
| Optimistic Concurrency | التزامن المتفائل | عمود `version` يمنع الكتابة فوق تعديل متزامن آخر دون علم المستخدم |
| Soft Delete | الحذف الناعم | عمود `deleted_at` يُخفي السجل دون حذفه فعليًا، حفاظًا على السجل التاريخي |
| JIT Provisioning | التزويد الفوري للحساب | إنشاء حساب `users` تلقائيًا عند أول دخول SSO ناجح إن لم يوجد حساب مطابق مسبقًا، دون خطوة تسجيل يدوية منفصلة |

## ملاحظة على الاستخدام
- عند كتابة أي Story أو Task جديد في Jira، استخدم المصطلح العربي من هذا
  الجدول حرفيًا، لا مرادفًا قريبًا (مثال: "تعيين تدريبي" دائمًا، وليس أحيانًا
  "الإسناد" وأحيانًا "التكليف" لنفس الشيء).
- أي جدول أو مصطلح جديد يُضاف للـSchema يجب أن يُضاف لهذا القاموس **في نفس
  الـPR**، لا لاحقًا — هذا الإصدار نفسه كان نتيجة إهمال هذه القاعدة لفترة
  طويلة (17 من أصل 43 جدولًا فقط كانت موثقة).