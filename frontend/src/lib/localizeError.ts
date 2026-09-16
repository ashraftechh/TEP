import type { TFunction } from 'i18next';

/**
 * Maps raw backend/database error strings or error codes into localized i18n messages.
 * This guarantees that when the user switches the active interface language,
 * any currently displayed error banners immediately update to the new language.
 */
export function localizeAuthError(
  error: string | null | undefined,
  t: TFunction,
  errorCode?: string | null
): string | null {
  if (!error && !errorCode) return null;

  if (errorCode) {
    switch (errorCode) {
      case 'invalid_credentials':
      case 'failed':
        return t('auth:serverErrors.invalidCredentials', {
          defaultValue: 'بيانات الاعتماد هذه غير متطابقة مع سجلاتنا.',
        });
      case 'account_suspended':
        return t('auth:serverErrors.accountSuspended', {
          defaultValue: 'تم تعليق هذا الحساب. يرجى التواصل مع إدارة النظام.',
        });
      case 'email_not_verified':
        return t('auth:serverErrors.emailNotVerified', {
          defaultValue: 'يرجى تأكيد بريدك الإلكتروني لتفعيل حسابك قبل تسجيل الدخول.',
        });
      case 'registration_incomplete':
        return t('auth:serverErrors.registrationIncomplete', {
          defaultValue: 'تسجيلك غير مكتمل. يرجى إتمام إعداد حسابك.',
        });
      case 'email_not_found':
        return t('auth:serverErrors.emailNotFound', {
          defaultValue: 'لا يوجد حساب مسجل بهذا البريد الإلكتروني.',
        });
      case 'unauthorized':
        return t('auth:serverErrors.unauthorized', {
          defaultValue: 'ليس لديك صلاحية لتنفيذ هذا الإجراء.',
        });
      case 'unauthenticated':
        return t('auth:serverErrors.unauthenticated', {
          defaultValue: 'يجب تسجيل الدخول للوصول إلى هذه الصفحة.',
        });
      case 'smtp_error':
        return t('auth:serverErrors.smtpError', {
          defaultValue: 'تعذر إرسال بريد التحقق. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.',
        });
      case 'unauthorized_application_area':
        return t('auth:serverErrors.unauthorizedApplicationArea', {
          defaultValue:
            'بوابة الدخول هذه مخصصة للطلاب وممثلي الشركات والمشرفين الأكاديميين فقط. يجب على منسقي التدريب ومدراء النظام تسجيل الدخول عبر لوحة التحكم الإدارية.',
        });
      case 'network_error':
        return t('auth:serverErrors.networkError', {
          defaultValue: 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.',
        });
      case 'server_error':
        return t('auth:serverErrors.serverError', {
          defaultValue: 'حدث خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً.',
        });
      case 'login_failed':
        return t('auth:serverErrors.loginFailed', {
          defaultValue: 'فشل تسجيل الدخول. يرجى التحقق من الاتصال بالخادم والمحاولة مرة أخرى.',
        });
      default:
        break;
    }
  }

  if (error) {
    const lower = error.toLowerCase();

    // 1. SMTP / Mail sending failures
    if (
      lower.includes('smtp') ||
      lower.includes('stream_socket_client') ||
      lower.includes('mail server') ||
      lower.includes('mail transport') ||
      lower.includes('transportexception') ||
      lower.includes('failed to authenticate on smtp') ||
      lower.includes('تعذر إرسال بريد التحقق') ||
      lower.includes('unable to send verification') ||
      lower.includes('unable to send email')
    ) {
      return t('auth:serverErrors.smtpError', {
        defaultValue: 'تعذر إرسال بريد التحقق. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.',
      });
    }

    // 2. Network / Server unreachable / Connection errors
    if (
      lower.includes('network error') ||
      lower.includes('failed to fetch') ||
      lower.includes('connection refused') ||
      lower.includes('err_network') ||
      lower.includes('econnrefused') ||
      lower.includes('network_error') ||
      lower.includes('network request failed') ||
      lower.includes('could not connect') ||
      lower.includes('تعذر الاتصال بالخادم')
    ) {
      return t('auth:serverErrors.networkError', {
        defaultValue: 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.',
      });
    }

    // 3. Login failed (backend offline or generic failure)
    if (
      lower.trim() === 'login failed' ||
      lower.includes('login failed') ||
      lower.includes('فشل تسجيل الدخول')
    ) {
      return t('auth:serverErrors.loginFailed', {
        defaultValue: 'فشل تسجيل الدخول. يرجى التحقق من الاتصال بالخادم والمحاولة مرة أخرى.',
      });
    }

    // 2. Invalid credentials
    if (
      lower.includes('credentials do not match') ||
      lower.includes('بيانات الاعتماد') ||
      lower.includes('invalid credentials')
    ) {
      return t('auth:serverErrors.invalidCredentials', {
        defaultValue: 'بيانات الاعتماد هذه غير متطابقة مع سجلاتنا.',
      });
    }

    // 3. Account suspended
    if (
      lower.includes('suspended') ||
      lower.includes('تعليق هذا الحساب') ||
      lower.includes('موقوف')
    ) {
      return t('auth:serverErrors.accountSuspended', {
        defaultValue: 'تم تعليق هذا الحساب. يرجى التواصل مع إدارة النظام.',
      });
    }

    // 4. Email not verified
    if (
      lower.includes('not verified') ||
      lower.includes('تأكيد بريدك') ||
      lower.includes('تفعيل حسابك')
    ) {
      return t('auth:serverErrors.emailNotVerified', {
        defaultValue: 'يرجى تأكيد بريدك الإلكتروني لتفعيل حسابك قبل تسجيل الدخول.',
      });
    }

    // 5. Unique constraint violations (Phone, Registration Number, Email)
    if (lower.includes('phone') || lower.includes('هاتف')) {
      if (
        lower.includes('taken') ||
        lower.includes('already') ||
        lower.includes('مستخدم') ||
        lower.includes('موجود')
      ) {
        return t('auth:serverErrors.phoneTaken', {
          defaultValue: 'قيمة رقم الهاتف مستخدمة من قبل.',
        });
      }
    }

    if (
      lower.includes('registration_number') ||
      lower.includes('registration number') ||
      lower.includes('سجل')
    ) {
      if (
        lower.includes('taken') ||
        lower.includes('already') ||
        lower.includes('مستخدم') ||
        lower.includes('موجود')
      ) {
        return t('auth:serverErrors.regNumberTaken', {
          defaultValue: 'قيمة رقم السجل التجاري مستخدمة من قبل.',
        });
      }
    }

    if (lower.includes('email') || lower.includes('بريد')) {
      if (
        lower.includes('taken') ||
        lower.includes('already') ||
        lower.includes('مستخدم') ||
        lower.includes('موجود')
      ) {
        return t('auth:serverErrors.emailTaken', {
          defaultValue: 'قيمة البريد الإلكتروني مستخدمة من قبل.',
        });
      }
    }

    if (
      lower.includes('already been taken') ||
      lower.includes('مستخدمة من قبل') ||
      lower.includes('موجود بالفعل')
    ) {
      return t('auth:serverErrors.emailTaken', {
        defaultValue: 'قيمة البريد الإلكتروني مستخدمة من قبل.',
      });
    }

    // 6. Unauthorized (403)
    if (lower.includes('unauthorized') || lower.includes('صلاحية لتنفيذ')) {
      return t('auth:serverErrors.unauthorized', {
        defaultValue: 'ليس لديك صلاحية لتنفيذ هذا الإجراء.',
      });
    }

    // 7. Unauthenticated (401)
    if (lower.includes('unauthenticated') || lower.includes('تسجيل الدخول للوصول')) {
      return t('auth:serverErrors.unauthenticated', {
        defaultValue: 'يجب تسجيل الدخول للوصول إلى هذه الصفحة.',
      });
    }

    // 8. Email not found (password reset)
    if (lower.includes('no account is registered') || lower.includes('لا يوجد حساب مسجل')) {
      return t('auth:serverErrors.emailNotFound', {
        defaultValue: 'لا يوجد حساب مسجل بهذا البريد الإلكتروني.',
      });
    }

    // 9. Incorrect password
    if (lower.includes('password is incorrect') || lower.includes('كلمة المرور غير صحيحة')) {
      return t('auth:serverErrors.passwordIncorrect', {
        defaultValue: 'كلمة المرور غير صحيحة.',
      });
    }

    // 10. Throttle / Rate limit
    if (
      lower.includes('too many attempts') ||
      lower.includes('too many login attempts') ||
      lower.includes('محاولات') ||
      lower.includes('throttle') ||
      lower.includes('rate_limited')
    ) {
      return t('auth:serverErrors.throttle', {
        defaultValue: 'عدد المحاولات كثيرة جداً. يرجى المحاولة لاحقاً.',
      });
    }

    // 11. Company request already exists
    if (
      lower.includes('registration request for this company already exists') ||
      lower.includes('يوجد طلب تسجيل مسبق') ||
      lower.includes('request_already_exists')
    ) {
      return t('companies:errors.requestAlreadyExists', {
        defaultValue: 'يوجد طلب تسجيل مسبق لهذه الشركة.',
      });
    }

    // 12. Incomplete registration
    if (lower.includes('incomplete') || lower.includes('غير مكتمل')) {
      return t('auth:serverErrors.registrationIncomplete', {
        defaultValue: 'تسجيلك غير مكتمل. يرجى إتمام إعداد حسابك.',
      });
    }

    // 13. Already complete registration
    if (lower.includes('already complete') || lower.includes('إكمال إعداد هذا الحساب')) {
      return t('auth:completeRegistration.errors.alreadyComplete', {
        defaultValue: 'تم إكمال إعداد هذا الحساب بالفعل.',
      });
    }

    // 14. Server error fallback
    if (
      lower.includes('errors.servererror') ||
      lower.includes('server error') ||
      lower.includes('internal server error') ||
      lower.includes('bad gateway') ||
      lower.includes('service unavailable') ||
      lower.includes('gateway timeout') ||
      lower.includes('500') ||
      lower.includes('502') ||
      lower.includes('503') ||
      lower.includes('504') ||
      lower.includes('خطأ في الخادم')
    ) {
      return t('auth:serverErrors.serverError', {
        defaultValue: 'حدث خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً.',
      });
    }

    return error;
  }

  return null;
}
