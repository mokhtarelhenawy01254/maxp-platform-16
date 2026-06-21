/**
 * @module i18n
 * @description Lightweight backend translation utility for merchant-facing system labels and errors.
 */

const translations = {
  ar: {
    whatsapp: {
      notifications_disabled: 'الإشعارات معطلة',
      module_disabled: 'هذا القسم من الإشعارات معطّل',
      no_session: 'لم يتم تحديد جلسة افتراضية',
      session_not_connected: 'الجلسة غير متصلة',
      no_template: 'القالب غير موجود',
      invalid_phone: 'رقم الهاتف غير صالح',
      send_failed: 'فشل في إرسال الرسالة',
      customer_opted_out: 'العميل ألغى اشتراكه في الإشعارات',
      unknown_error: 'حدث خطأ غير معروف'
    },
    task: {
      status: {
        PENDING: 'قيد الانتظار',
        IN_PROGRESS: 'قيد التنفيذ',
        COMPLETED: 'تم التنفيذ',
        CANCELLED: 'ملغاة',
        ON_HOLD: 'متوقفة',
        fallback: 'غير محدد'
      },
      priority: {
        LOW: 'منخفضة',
        MEDIUM: 'متوسطة',
        HIGH: 'عالية',
        URGENT: 'عاجلة',
        fallback: 'غير محدد'
      },
      execution: {
        done: 'تم التنفيذ',
        not_done: 'لم يتم بعد',
        blocked: 'توجد مشكلة'
      },
      userFallback: 'المستخدم'
    },
    shipping: {
      unsupported: 'عذراً، الشحن غير متاح لمحافظة {{governorate}}.'
    },
    rag: {
      no_info: 'لم نتمكن من العثور على معلومات كافية.'
    },
    agentError: {
      tool_call_leak_tip: 'الموديل حاول يطبع تعليمات داخلية بدل الرد. تم منع عرضها، اختار موديل Agent-ready أو أعد المحاولة.',
      ungrounded_reply_tip: 'تم منع الرد لأنه ادعى تنفيذ إجراء غير مثبت في سجل الأدوات. راجع سجل الوكيل أو أعد الطلب بتفاصيل أوضح.',
      model_not_agent_ready_tip: 'الموديل المختار يعمل في اختبار المحادثة المباشر، لكنه غير مناسب للوكيل لأنه لا يدعم استدعاء الأدوات المطلوبة في هذا المسار. اختر موديل Agent-ready للوكيل.',
      preferred_model_not_available_tip: 'الموديل المختار غير مرتبط بمفتاح نشط لهذا المزود. راجع إعدادات المزود أو اختر موديل متاح للوكيل.',
      budget_exhausted_tip: 'مزود الذكاء الصناعي غير متاح مؤقتاً. راجع حدود المزود أو أعد المحاولة بعد قليل.',
      llm_unavailable_tip: 'المزود أو الموديل لم يستجب في الوقت المناسب. غيّر لموديل مناسب للوكيل أو أعد المحاولة بعد قليل.',
      generic_tip: 'الموديل لم يرجع رد صالح. راجع الموديل المختار أو أعد المحاولة بعد تغيير مزود مناسب للوكيل.',
      prefix: 'خطأ الوكيل الذكي',
      reason: 'السبب',
      model: 'الموديل',
      model_error: 'خطأ الموديل',
      message: 'الرسالة',
      tip: 'تلميح',
      undefined: 'غير محدد'
    },
    otp: {
      sent: 'تم إرسال كود التحقق',
      error: 'حدث خطأ أثناء إرسال كود التحقق'
    },
    competitor: {
      list_failed: 'فشل في جلب المنافسين',
      get_failed: 'فشل في جلب المنافس',
      not_found: 'المنافس غير موجود',
      name_required: 'اسم المنافس مطلوب',
      create_failed: 'فشل في إنشاء المنافس',
      update_failed: 'فشل في تحديث المنافس',
      delete_success: 'تم حذف المنافس بنجاح',
      delete_failed: 'فشل في حذف المنافس',
      product_add_failed: 'فشل في إضافة المنتج',
      products_list_failed: 'فشل في جلب منتجات المنافس',
      product_not_found: 'المنتج غير موجود',
      price_history_failed: 'فشل في جلب تاريخ الأسعار',
      ad_add_failed: 'فشل في إضافة الإعلان',
      ads_list_failed: 'فشل في جلب إعلانات المنافس',
      report_create_failed: 'فشل في إنشاء التقرير',
      reports_list_failed: 'فشل في جلب التقارير',
      price_compare_failed: 'فشل في مقارنة الأسعار',
      summary_failed: 'فشل في جلب ملخص المنافسين',
      features_list_failed: 'فشل في جلب ميزات المنافس',
      feature_title_required: 'عنوان الميزة مطلوب',
      feature_create_failed: 'فشل في إضافة الميزة',
      feature_not_found: 'الميزة غير موجودة',
      feature_update_failed: 'فشل في تحديث الميزة',
      feature_delete_success: 'تم حذف الميزة بنجاح',
      feature_delete_failed: 'فشل في حذف الميزة',
      report_summary: 'تم تحليل {{products}} منتج و {{ads}} إعلان. {{newProducts}} منتج جديد، {{priceChanges}} تغير سعر',
      monitor_summary: 'تم تتبع {{products}} منتج و {{ads}} إعلانات. {{newProducts}} منتج جديد، {{priceChanges}} تغير سعر.',
      report_title: 'تقرير {{type}} - {{name}}',
      weekly_report_title: 'تقرير أسبوعي - {{name}}',
      report_type_weekly: 'أسبوعي',
      report_type_full: 'شامل',
      media_note_create_failed: 'فشل في إضافة ملاحظة الوسائط',
      media_note_delete_failed: 'فشل في حذف ملاحظة الوسائط',
      media_note_list_failed: 'فشل في جلب ملاحظات الوسائط',
      comparison_create_failed: 'فشل في إنشاء المقارنة',
      comparison_update_failed: 'فشل في تحديث المقارنة',
      comparison_delete_failed: 'فشل في حذف المقارنة',
      comparison_list_failed: 'فشل في جلب المقارنات',
      comparison_reorder_failed: 'فشل في إعادة ترتيب المقارنات',
      comparison_not_found: 'المقارنة غير موجودة',
      dev_idea_create_failed: 'فشل في إنشاء فكرة التطوير',
      dev_idea_update_failed: 'فشل في تحديث فكرة التطوير',
      dev_idea_delete_failed: 'فشل في حذف فكرة التطوير',
      dev_idea_list_failed: 'فشل في جلب أفكار التطوير',
      dev_idea_reorder_failed: 'فشل في إعادة ترتيب أفكار التطوير',
      dev_idea_not_found: 'فكرة التطوير غير موجودة',
      dev_idea_image_add_failed: 'فشل في إضافة صورة الفكرة',
      dev_idea_image_delete_failed: 'فشل في حذف صورة الفكرة',
      activity_image_add_failed: 'فشل في إضافة صورة النشاط',
      activity_image_delete_failed: 'فشل في حذف صورة النشاط',
      activity_image_list_failed: 'فشل في جلب صور النشاط',
      activity_image_reorder_failed: 'فشل في إعادة ترتيب صور النشاط',
      feature_image_add_failed: 'فشل في إضافة صورة الميزة',
      feature_image_delete_failed: 'فشل في حذف صورة الميزة',
      feature_image_list_failed: 'فشل في جلب صور الميزات',
      feature_image_reorder_failed: 'فشل في إعادة ترتيب صور الميزات',
      social_credentials_update_failed: 'فشل في تحديث بيانات الدخول'
    },
    devGoals: {
      list_failed: 'فشل جلب الأهداف',
      dashboard_failed: 'فشل جلب إحصائيات الأهداف',
      alignment_failed: 'فشل جلب شجرة المحاذاة',
      not_found: 'الهدف غير موجود',
      get_failed: 'فشل جلب الهدف',
      create_failed: 'فشل إنشاء الهدف',
      update_failed: 'فشل تحديث الهدف',
      delete_success: 'تم حذف الهدف',
      delete_failed: 'فشل حذف الهدف',
      keyResult_add_failed: 'فشل إضافة النتيجة الرئيسية',
      keyResult_update_failed: 'فشل تحديث النتيجة الرئيسية',
      keyResult_delete_success: 'تم حذف النتيجة الرئيسية',
      keyResult_delete_failed: 'فشل حذف النتيجة الرئيسية',
      progress_update_failed: 'فشل تحديث التقدم',
      bulk_update_failed: 'فشل التحديث الجماعي',
      checkIn_add_failed: 'فشل إضافة المراجعة',
      checkIns_list_failed: 'فشل جلب المراجعات',
      link_task_success: 'تم ربط المهمة بالهدف',
      link_task_failed: 'فشل ربط المهمة',
      bulk_link_failed: 'فشل الربط الجماعي',
      unlink_task_success: 'تم إلغاء ربط المهمة',
      unlink_task_failed: 'فشل إلغاء الربط'
    },
    timer: {
      resume_success: 'تم استئناف المؤقت',
      resume_failed: 'فشل استئناف المؤقت',
      active_fetch_failed: 'فشل جلب المؤقت النشط',
      active_list_failed: 'فشل جلب المؤقتات النشطة',
      group_name_required: 'اسم المجموعة مطلوب',
      group_create_failed: 'فشل إنشاء المجموعة',
      group_list_failed: 'فشل جلب المجموعات',
      group_not_found: 'المجموعة غير موجودة',
      group_delete_success: 'تم حذف المجموعة',
      group_delete_failed: 'فشل حذف المجموعة',
      group_add_tasks_failed: 'فشل إضافة المهام',
      group_remove_task_success: 'تم إزالة المهمة من المجموعة',
      group_remove_task_failed: 'فشل إزالة المهمة',
      group_already_running: 'المجموعة تعمل بالفعل',
      group_empty: 'المجموعة لا تحتوي على مهام',
      group_start_success: 'تم بدء المؤقت لـ {{count}} مهمة',
      group_start_failed: 'فشل بدء المؤقت',
      group_not_running: 'المجموعة ليست قيد التشغيل',
      group_stop_success: 'تم إيقاف المؤقت لـ {{count}} مهمة',
      group_stop_failed: 'فشل إيقاف المؤقت',
      working_time_failed: 'فشل حساب وقت العمل الفعلي'
    },
    agent: {
      facebook_messenger_name: 'وكيل فيسبوك وماسنجر'
    },
    system: {
      key_rotation_removed: 'تم إزالة نظام تدوير المفاتيح التلقائي. يتم الآن استخدام أول مفتاح نشط.',
      key_rotation_error: 'خطأ في استراتيجية تبديل المفاتيح',
      key_selection_desc: 'اختيار أول مفتاح نشط - بدون تبديل تلقائي',
      systems_fetched: 'تم جلب الأنظمة بنجاح',
      fetch_error: 'خطأ في جلب الأنظمة'
    },
    agentConfig: {
      saved: 'تم حفظ إعدادات الوكيل بنجاح',
      saveFailed: 'فشل حفظ الإعدادات'
    },
    agentInbox: {
      expiry_future: 'تاريخ انتهاء المفتاح يجب أن يكون في المستقبل',
      no_permission: 'ليس لديك صلاحية لإدارة مفاتيح Agent Inbox',
      company_not_found: 'الشركة المطلوبة غير موجودة',
      company_search_not_found: 'لم يتم العثور على شركة تطابق "{{search}}"',
      company_id_required: 'معرف الشركة مطلوب',
      admin_load_failed: 'فشل في تحميل إعدادات Agent Inbox',
      unknown_user: 'المستخدم الحالي غير معروف',
      credential_created: 'تم إنشاء مفتاح Agent Inbox. انسخه الآن لأنه لن يظهر مرة أخرى.',
      credential_create_failed: 'فشل في إنشاء مفتاح Agent Inbox',
      credential_not_found: 'مفتاح Agent Inbox غير موجود',
      credential_rotated: 'تم تدوير المفتاح. انسخ المفتاح الجديد الآن.',
      credential_rotate_failed: 'فشل تدوير مفتاح Agent Inbox',
      credential_revoked: 'تم إلغاء مفتاح Agent Inbox',
      credential_revoke_failed: 'فشل إلغاء مفتاح Agent Inbox',
      conversations_list_failed: 'فشل في جلب محادثات فيسبوك',
      messages_list_failed: 'فشل في جلب رسائل المحادثة',
      messages_pull_failed: 'فشل سحب رسائل المحادثة من فيسبوك',
      conversations_pull_failed: 'فشل سحب آخر محادثات فيسبوك',
      evaluate_failed: 'فشل تقييم المحادثة'
    }
  },
  en: {
    whatsapp: {
      notifications_disabled: 'Notifications disabled',
      module_disabled: 'This notifications module is disabled',
      no_session: 'No default session selected',
      session_not_connected: 'Session not connected',
      no_template: 'Template not found',
      invalid_phone: 'Invalid phone number',
      send_failed: 'Failed to send message',
      customer_opted_out: 'Customer opted out of notifications',
      unknown_error: 'Unknown error occurred'
    },
    task: {
      status: {
        PENDING: 'Pending',
        IN_PROGRESS: 'In Progress',
        COMPLETED: 'Completed',
        CANCELLED: 'Cancelled',
        ON_HOLD: 'On Hold',
        fallback: 'Undefined'
      },
      priority: {
        LOW: 'Low',
        MEDIUM: 'Medium',
        HIGH: 'High',
        URGENT: 'Urgent',
        fallback: 'Undefined'
      },
      execution: {
        done: 'Done',
        not_done: 'Not done yet',
        blocked: 'There is a problem'
      },
      userFallback: 'User'
    },
    shipping: {
      unsupported: 'Sorry, shipping is not available to {{governorate}}.'
    },
    rag: {
      no_info: 'No relevant information found.'
    },
    agentError: {
      tool_call_leak_tip: 'The model attempted to output internal instructions instead of a reply. Display was blocked; select an Agent-ready model or try again.',
      ungrounded_reply_tip: 'The reply was blocked because it claimed to perform an action not found in the tool registry. Check the agent log or request again with clearer details.',
      model_not_agent_ready_tip: 'The selected model works in live chat testing, but is not suitable for the agent because it does not support calling required tools in this flow. Choose an Agent-ready model.',
      preferred_model_not_available_tip: 'The selected model is not associated with an active key for this provider. Check provider settings or choose an available model.',
      budget_exhausted_tip: 'The AI provider is temporarily unavailable. Check provider limits or try again in a moment.',
      llm_unavailable_tip: 'The provider or model did not respond in time. Change to a suitable model or try again in a moment.',
      generic_tip: 'The model did not return a valid reply. Review the selected model or try again after changing to a suitable provider.',
      prefix: 'Smart Agent Error',
      reason: 'Reason',
      model: 'Model',
      model_error: 'Model Error',
      message: 'Message',
      tip: 'Tip',
      undefined: 'Undefined'
    },
    otp: {
      sent: 'Verification code sent',
      error: 'An error occurred while sending the verification code'
    },
    competitor: {
      list_failed: 'Failed to fetch competitors',
      get_failed: 'Failed to fetch competitor',
      not_found: 'Competitor not found',
      name_required: 'Competitor name is required',
      create_failed: 'Failed to create competitor',
      update_failed: 'Failed to update competitor',
      delete_success: 'Competitor deleted successfully',
      delete_failed: 'Failed to delete competitor',
      product_add_failed: 'Failed to add product',
      products_list_failed: 'Failed to fetch competitor products',
      product_not_found: 'Product not found',
      price_history_failed: 'Failed to fetch price history',
      ad_add_failed: 'Failed to add ad',
      ads_list_failed: 'Failed to fetch competitor ads',
      report_create_failed: 'Failed to create report',
      reports_list_failed: 'Failed to fetch reports',
      price_compare_failed: 'Failed to compare prices',
      summary_failed: 'Failed to fetch competitor summary',
      features_list_failed: 'Failed to fetch competitor features',
      feature_title_required: 'Feature title is required',
      feature_create_failed: 'Failed to create feature',
      feature_not_found: 'Feature not found',
      feature_update_failed: 'Failed to update feature',
      feature_delete_success: 'Feature deleted successfully',
      feature_delete_failed: 'Failed to delete feature',
      report_summary: 'Analyzed {{products}} products and {{ads}} ads. {{newProducts}} new products, {{priceChanges}} price changes',
      monitor_summary: 'Tracked {{products}} products and {{ads}} ads. {{newProducts}} new products, {{priceChanges}} price changes.',
      report_title: '{{type}} report - {{name}}',
      weekly_report_title: 'Weekly report - {{name}}',
      report_type_weekly: 'Weekly',
      report_type_full: 'Full',
      media_note_create_failed: 'Failed to create media note',
      media_note_delete_failed: 'Failed to delete media note',
      media_note_list_failed: 'Failed to list media notes',
      comparison_create_failed: 'Failed to create comparison',
      comparison_update_failed: 'Failed to update comparison',
      comparison_delete_failed: 'Failed to delete comparison',
      comparison_list_failed: 'Failed to list comparisons',
      comparison_reorder_failed: 'Failed to reorder comparisons',
      comparison_not_found: 'Comparison not found',
      dev_idea_create_failed: 'Failed to create dev idea',
      dev_idea_update_failed: 'Failed to update dev idea',
      dev_idea_delete_failed: 'Failed to delete dev idea',
      dev_idea_list_failed: 'Failed to list dev ideas',
      dev_idea_reorder_failed: 'Failed to reorder dev ideas',
      dev_idea_not_found: 'Dev idea not found',
      dev_idea_image_add_failed: 'Failed to add dev idea image',
      dev_idea_image_delete_failed: 'Failed to delete dev idea image',
      activity_image_add_failed: 'Failed to add activity image',
      activity_image_delete_failed: 'Failed to delete activity image',
      activity_image_list_failed: 'Failed to list activity images',
      activity_image_reorder_failed: 'Failed to reorder activity images',
      feature_image_add_failed: 'Failed to add feature image',
      feature_image_delete_failed: 'Failed to delete feature image',
      feature_image_list_failed: 'Failed to list feature images',
      feature_image_reorder_failed: 'Failed to reorder feature images',
      social_credentials_update_failed: 'Failed to update social credentials'
    },
    devGoals: {
      list_failed: 'Failed to fetch goals',
      dashboard_failed: 'Failed to fetch goal statistics',
      alignment_failed: 'Failed to fetch alignment tree',
      not_found: 'Goal not found',
      get_failed: 'Failed to fetch goal',
      create_failed: 'Failed to create goal',
      update_failed: 'Failed to update goal',
      delete_success: 'Goal deleted',
      delete_failed: 'Failed to delete goal',
      keyResult_add_failed: 'Failed to add key result',
      keyResult_update_failed: 'Failed to update key result',
      keyResult_delete_success: 'Key result deleted',
      keyResult_delete_failed: 'Failed to delete key result',
      progress_update_failed: 'Failed to update progress',
      bulk_update_failed: 'Failed to bulk update progress',
      checkIn_add_failed: 'Failed to add check-in',
      checkIns_list_failed: 'Failed to fetch check-ins',
      link_task_success: 'Task linked to goal',
      link_task_failed: 'Failed to link task',
      bulk_link_failed: 'Failed to link tasks',
      unlink_task_success: 'Task unlinked from goal',
      unlink_task_failed: 'Failed to unlink task'
    },
    timer: {
      resume_success: 'Timer resumed',
      resume_failed: 'Failed to resume timer',
      active_fetch_failed: 'Failed to fetch active timer',
      active_list_failed: 'Failed to fetch active timers',
      group_name_required: 'Group name is required',
      group_create_failed: 'Failed to create group',
      group_list_failed: 'Failed to fetch groups',
      group_not_found: 'Group not found',
      group_delete_success: 'Group deleted',
      group_delete_failed: 'Failed to delete group',
      group_add_tasks_failed: 'Failed to add tasks',
      group_remove_task_success: 'Task removed from group',
      group_remove_task_failed: 'Failed to remove task',
      group_already_running: 'Group is already running',
      group_empty: 'Group has no tasks',
      group_start_success: 'Started timer for {{count}} tasks',
      group_start_failed: 'Failed to start timer',
      group_not_running: 'Group is not running',
      group_stop_success: 'Stopped timer for {{count}} tasks',
      group_stop_failed: 'Failed to stop timer',
      working_time_failed: 'Failed to calculate working time'
    },
    agent: {
      facebook_messenger_name: 'Facebook & Messenger Agent'
    },
    system: {
      key_rotation_removed: 'Key rotation system has been removed. The first active key is now used.',
      key_rotation_error: 'Error in key rotation strategy',
      key_selection_desc: 'Select first active key - no automatic rotation',
      systems_fetched: 'Systems fetched successfully',
      fetch_error: 'Error fetching systems'
    },
    agentConfig: {
      saved: 'Agent configuration saved successfully',
      saveFailed: 'Failed to save configuration'
    },
    agentInbox: {
      expiry_future: 'API key expiration must be in the future',
      no_permission: 'You do not have permission to manage Agent Inbox keys',
      company_not_found: 'Requested company not found',
      company_search_not_found: 'No company found matching "{{search}}"',
      company_id_required: 'Company ID is required',
      admin_load_failed: 'Failed to load Agent Inbox settings',
      unknown_user: 'Current user is unknown',
      credential_created: 'Agent Inbox key created. Copy it now as it will not be shown again.',
      credential_create_failed: 'Failed to create Agent Inbox key',
      credential_not_found: 'Agent Inbox key not found',
      credential_rotated: 'Key rotated. Copy the new key now.',
      credential_rotate_failed: 'Failed to rotate Agent Inbox key',
      credential_revoked: 'Agent Inbox key revoked',
      credential_revoke_failed: 'Failed to revoke Agent Inbox key',
      conversations_list_failed: 'Failed to fetch Facebook conversations',
      messages_list_failed: 'Failed to fetch conversation messages',
      messages_pull_failed: 'Failed to pull messages from Facebook',
      conversations_pull_failed: 'Failed to pull recent Facebook conversations',
      evaluate_failed: 'Failed to evaluate conversation'
    }
  }
};

function t(key, locale = 'ar', variables = {}) {
  const keys = String(key).split('.');
  let current = translations[locale] || translations.ar;

  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return key;
    }
  }

  if (typeof current !== 'string') {
    return key;
  }

  let text = current;
  for (const [varName, varVal] of Object.entries(variables)) {
    text = text.replace(new RegExp(`\\{\\{\\s*${varName}\\s*\\}\\}`, 'g'), String(varVal));
  }

  return text;
}

module.exports = {
  t
};
