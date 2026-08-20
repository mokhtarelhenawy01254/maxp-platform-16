const { getSharedPrismaClient } = require('../services/sharedDatabase');
const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');
const { toCanonicalE164 } = require('../utils/phoneNormalization');
const getPrisma = () => getSharedPrismaClient();

/**
 * 📄 Store Pages Controller
 * إدارة صفحات المتجر القابلة للتخصيص
 */

const safeParseJson = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return {};
  }
};

const resolveStorePagesCompanyId = async (identifier) => {
  if (!identifier) return null;

  const company = await getPrisma().company.findFirst({
    where: {
      OR: [{ id: identifier }, { slug: identifier }],
      isActive: true
    },
    select: { id: true }
  });

  return company?.id || null;
};

const normalizeNewsletterName = (rawName, email) => {
  const cleanName = String(rawName || '').trim();
  if (cleanName) return cleanName;

  const emailPrefix = String(email || '').split('@')[0].replace(/[._-]+/g, ' ').trim();
  return emailPrefix || 'مشترك جديد';
};

const RAG_POLICY_PAGE_TYPES = new Set([
  'SHIPPING_POLICY',
  'RETURN_POLICY',
  'REFUND_POLICY',
  'PRIVACY_POLICY',
  'TERMS_CONDITIONS'
]);

const refreshRagPoliciesForCompany = async (companyId, pageType) => {
  return undefined;
};

const syncStorePageVectorPolicy = async (page) => {
  return undefined;
};

const removeStorePageVectorPolicy = async (pageId, companyId, pageType) => {
  return undefined;
};

/**
 * Get all store pages for a company (PUBLIC - no authentication required)
 * Supports both companyId and slug from body or params
 */
const getAllPages = async (req, res) => {
  try {
    // Support authenticated company context, explicit companyId, or public slug lookup.
    const requestedCompanyId =
      req.user?.effectiveCompanyId ||
      req.user?.companyId ||
      req.body?.companyId ||
      null;
    const slug = req.body?.slug || req.params?.companyId;
    const { includeInactive } = req.query;

    // Use company from auth or middleware if available.
    let actualCompanyId = requestedCompanyId || req.company?.id;

    // If no company from middleware, try to find by slug
    if (!actualCompanyId && slug) {
      const company = await getPrisma().company.findFirst({
        where: {
          slug: slug,
          isActive: true
        },
        select: { id: true }
      });

      if (company) {
        actualCompanyId = company.id;
      } else {
        // Try as ID if slug lookup failed
        const companyById = await getPrisma().company.findFirst({
          where: {
            id: slug,
            isActive: true
          },
          select: { id: true }
        });

        if (companyById) {
          actualCompanyId = companyById.id;
        }
      }
    }

    if (!actualCompanyId) {
      return res.status(400).json({
        success: false,
        error: 'المتجر غير موجود أو غير نشط',
        hint: 'استخدم companyId أو slug في body أو params'
      });
    }

    const whereClause = { companyId: actualCompanyId };
    if (!includeInactive || includeInactive === 'false') {
      whereClause.isActive = true;
    }

    const pages = await getPrisma().storePage.findMany({
      where: whereClause,
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({
      success: true,
      data: pages
    });
  } catch (error) {
    console.error('❌ Error fetching store pages:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب صفحات المتجر',
      message: error.message
    });
  }
};

/**
 * Get a single page by ID
 */
const getPageById = async (req, res) => {
  try {
    const { companyId } = req.body;
    const { pageId } = req.params;
    const userCompanyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'معرف الشركة مطلوب'
      });
    }

    // Check if user has access to this company
    if (req.user?.role !== 'SUPER_ADMIN' && companyId !== userCompanyId) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية للوصول لهذه الشركة'
      });
    }

    const page = await getPrisma().storePage.findFirst({
      where: {
        id: pageId,
        companyId
      }
    });

    if (!page) {
      return res.status(404).json({
        success: false,
        error: 'الصفحة غير موجودة'
      });
    }

    res.json({
      success: true,
      data: page
    });
  } catch (error) {
    console.error('❌ Error fetching page:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب الصفحة',
      message: error.message
    });
  }
};

/**
 * Get a page by slug (for public access)
 * Supports both companyId and slug
 */
const getPageBySlug = async (req, res) => {
  try {
    const { companyId, slug } = req.params;

    // Determine if companyId is actually a slug or an ID
    let actualCompanyId = companyId;

    // Check if it looks like a slug (contains hyphens or is shorter than typical CUID)
    const looksLikeSlug = companyId.includes('-') || companyId.length < 20;

    if (looksLikeSlug) {
      const company = await getPrisma().company.findUnique({
        where: { slug: companyId },
        select: { id: true }
      });

      if (company) {
        actualCompanyId = company.id;
      }
    }

    const page = await getPrisma().storePage.findFirst({
      where: {
        slug,
        companyId: actualCompanyId,
        isActive: true
      }
    });

    if (!page) {
      return res.status(404).json({
        success: false,
        error: 'الصفحة غير موجودة'
      });
    }

    res.json({
      success: true,
      data: page
    });
  } catch (error) {
    console.error('❌ Error fetching page by slug:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب الصفحة',
      message: error.message
    });
  }
};

const newsletterSubscribe = async (req, res) => {
  try {
    const actualCompanyId = await resolveStorePagesCompanyId(req.params?.companyId);
    if (!actualCompanyId) {
      return res.status(404).json({
        success: false,
        error: 'المتجر غير موجود'
      });
    }

    const email = String(req.body?.email || '').trim().toLowerCase();
    const phone = String(req.body?.phone || '').trim() || null;
    const fullName = normalizeNewsletterName(req.body?.name || req.body?.fullName, email);

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'البريد الإلكتروني مطلوب'
      });
    }

    const [firstName, ...restName] = fullName.split(/\s+/).filter(Boolean);
    const lastName = restName.join(' ') || 'النشرة';
    const customerFilters = [{ email }];
    if (phone) {
      const { getPhoneVariants } = require('../utils/phoneNormalization');
      customerFilters.push({ OR: [{ phoneNormalized: toCanonicalE164(phone) }, { phone: { in: getPhoneVariants(phone) } }] });
    }

    const existingCustomer = await getPrisma().customer.findFirst({
      where: {
        companyId: actualCompanyId,
        OR: customerFilters
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        tags: true,
        metadata: true
      }
    });

    const existingTags = safeParseJson(existingCustomer?.tags);
    const existingTagList = Array.isArray(existingTags) ? existingTags : [];
    const alreadySubscribed = existingTagList.includes('newsletter');
    const nextTags = [...new Set([...existingTagList, 'newsletter', 'storefront'])];

    const existingMetadata = safeParseJson(existingCustomer?.metadata);
    const nextMetadata = {
      ...existingMetadata,
      newsletter: {
        ...(typeof existingMetadata.newsletter === 'object' && existingMetadata.newsletter ? existingMetadata.newsletter : {}),
        subscribedAt: new Date().toISOString(),
        source: 'storefront_footer',
        email
      }
    };

    let customer = null;
    if (existingCustomer?.id) {
      customer = await getPrisma().customer.update({
        where: { id: existingCustomer.id },
        data: {
          firstName: existingCustomer.firstName || firstName || 'مشترك',
          lastName: existingCustomer.lastName || lastName,
          email: existingCustomer.email || email,
          phone: existingCustomer.phone || phone,
          status: 'LEAD',
          tags: JSON.stringify(nextTags),
          metadata: JSON.stringify(nextMetadata)
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true
        }
      });
    } else {
      const { safeCreateCustomer, buildPhoneWhere } = require('../utils/customerIdentity');
      customer = await safeCreateCustomer(
        getPrisma(),
        {
          data: {
            companyId: actualCompanyId,
            firstName: firstName || 'مشترك',
            lastName,
            email,
            phone,
            phoneNormalized: phone ? toCanonicalE164(phone) : null,
            status: 'LEAD',
            tags: JSON.stringify(nextTags),
            metadata: JSON.stringify(nextMetadata)
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        phone ? buildPhoneWhere(phone, actualCompanyId) : { companyId: actualCompanyId, email }
      );
    }

    if (!alreadySubscribed) {
      Promise.allSettled([
        WhatsAppNotificationService.sendNewsletterSubscribedNotification({
          companyId: actualCompanyId,
          email,
          recipientPhone: customer.phone || '',
          recipientName: `${customer.firstName} ${customer.lastName}`.trim(),
          customerId: customer.id,
          sourceLabel: 'storefront_footer'
        })
      ]).catch((notificationError) => {
        console.error('❌ Error queueing newsletter WhatsApp notifications:', notificationError);
      });
    }

    res.status(existingCustomer ? 200 : 201).json({
      success: true,
      message: alreadySubscribed ? 'أنت مشترك بالفعل في النشرة' : 'تم الاشتراك في النشرة بنجاح',
      data: {
        customerId: customer.id,
        alreadySubscribed
      }
    });
  } catch (error) {
    console.error('❌ Error subscribing to newsletter:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في الاشتراك في النشرة',
      message: error.message
    });
  }
};

/**
 * Create a new store page
 */
const createPage = async (req, res) => {
  try {
    const {
      companyId,
      title,
      slug,
      content,
      pageType,
      isActive,
      showInFooter,
      showInMenu,
      order,
      metaTitle,
      metaDescription
    } = req.body;
    const userCompanyId = req.user?.companyId;

    // Validate required fields
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'معرف الشركة مطلوب'
      });
    }

    // Check if user has access to this company
    if (req.user?.role !== 'SUPER_ADMIN' && companyId !== userCompanyId) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية للوصول لهذه الشركة'
      });
    }

    if (!title || !slug || !content) {
      return res.status(400).json({
        success: false,
        error: 'العنوان والرابط والمحتوى مطلوبة'
      });
    }

    // Check if slug already exists for this company
    const existingPage = await getPrisma().storePage.findFirst({
      where: {
        companyId,
        slug
      }
    });

    if (existingPage) {
      return res.status(400).json({
        success: false,
        error: 'الرابط مستخدم بالفعل'
      });
    }

    const page = await getPrisma().storePage.create({
      data: {
        companyId,
        title,
        slug,
        content,
        pageType: pageType || 'CUSTOM',
        isActive: isActive !== undefined ? isActive : true,
        showInFooter: showInFooter !== undefined ? showInFooter : true,
        showInMenu: showInMenu !== undefined ? showInMenu : false,
        order: order || 0,
        metaTitle,
        metaDescription
        }
      });

      await refreshRagPoliciesForCompany(companyId, page.pageType);
      await syncStorePageVectorPolicy(page);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الصفحة بنجاح',
      data: page
    });
  } catch (error) {
    console.error('❌ Error creating page:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في إنشاء الصفحة',
      message: error.message
    });
  }
};

/**
 * Update a store page
 */
const updatePage = async (req, res) => {
  try {
    const { pageId } = req.params;
    const {
      companyId,
      title,
      slug,
      content,
      pageType,
      isActive,
      showInFooter,
      showInMenu,
      order,
      metaTitle,
      metaDescription
    } = req.body;
    const userCompanyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'معرف الشركة مطلوب'
      });
    }

    // Check if user has access to this company
    if (req.user?.role !== 'SUPER_ADMIN' && companyId !== userCompanyId) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية للوصول لهذه الشركة'
      });
    }

    // Check if page exists
    const existingPage = await getPrisma().storePage.findFirst({
      where: {
        id: pageId,
        companyId
      }
    });

    if (!existingPage) {
      return res.status(404).json({
        success: false,
        error: 'الصفحة غير موجودة'
      });
    }

    // If slug is being changed, check if new slug is available
    if (slug && slug !== existingPage.slug) {
      const slugExists = await getPrisma().storePage.findFirst({
        where: {
          companyId,
          slug,
          id: { not: pageId }
        }
      });

      if (slugExists) {
        return res.status(400).json({
          success: false,
          error: 'الرابط مستخدم بالفعل'
        });
      }
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug;
    if (content !== undefined) updateData.content = content;
    if (pageType !== undefined) updateData.pageType = pageType;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (showInFooter !== undefined) updateData.showInFooter = showInFooter;
    if (showInMenu !== undefined) updateData.showInMenu = showInMenu;
    if (order !== undefined) updateData.order = order;
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription;

    const page = await getPrisma().storePage.update({
      where: { id: pageId },
      data: updateData
    });

    await refreshRagPoliciesForCompany(companyId, existingPage.pageType);
    if (page.pageType !== existingPage.pageType) {
      await refreshRagPoliciesForCompany(companyId, page.pageType);
    }
    await syncStorePageVectorPolicy(page);

    res.json({
      success: true,
      message: 'تم تحديث الصفحة بنجاح',
      data: page
    });
  } catch (error) {
    console.error('❌ Error updating page:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في تحديث الصفحة',
      message: error.message
    });
  }
};

/**
 * Delete a store page
 */
const deletePage = async (req, res) => {
  try {
    const { companyId } = req.body;
    const { pageId } = req.params;
    const userCompanyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'معرف الشركة مطلوب'
      });
    }

    // Check if user has access to this company
    if (req.user?.role !== 'SUPER_ADMIN' && companyId !== userCompanyId) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية للوصول لهذه الشركة'
      });
    }

    // Check if page exists
    const existingPage = await getPrisma().storePage.findFirst({
      where: {
        id: pageId,
        companyId
      }
    });

    if (!existingPage) {
      return res.status(404).json({
        success: false,
        error: 'الصفحة غير موجودة'
      });
    }

    await getPrisma().storePage.delete({
      where: { id: pageId }
    });

    await refreshRagPoliciesForCompany(companyId, existingPage.pageType);
    await removeStorePageVectorPolicy(existingPage.id, companyId, existingPage.pageType);

    res.json({
      success: true,
      message: 'تم حذف الصفحة بنجاح'
    });
  } catch (error) {
    console.error('❌ Error deleting page:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في حذف الصفحة',
      message: error.message
    });
  }
};

/**
 * Toggle page active status
 */
const togglePageStatus = async (req, res) => {
  try {
    const { companyId } = req.body;
    const { pageId } = req.params;
    const userCompanyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'معرف الشركة مطلوب'
      });
    }

    // Check if user has access to this company
    if (req.user?.role !== 'SUPER_ADMIN' && companyId !== userCompanyId) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية للوصول لهذه الشركة'
      });
    }

    const page = await getPrisma().storePage.findFirst({
      where: {
        id: pageId,
        companyId
      }
    });

    if (!page) {
      return res.status(404).json({
        success: false,
        error: 'الصفحة غير موجودة'
      });
    }

    const updatedPage = await getPrisma().storePage.update({
      where: { id: pageId },
      data: { isActive: !page.isActive }
    });

    await refreshRagPoliciesForCompany(companyId, updatedPage.pageType);
    await syncStorePageVectorPolicy(updatedPage);

    res.json({
      success: true,
      message: `تم ${updatedPage.isActive ? 'تفعيل' : 'إلغاء تفعيل'} الصفحة بنجاح`,
      data: updatedPage
    });
  } catch (error) {
    console.error('❌ Error toggling page status:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في تغيير حالة الصفحة',
      message: error.message
    });
  }
};

/**
 * Initialize default pages for a company
 */
const initializeDefaultPages = async (req, res) => {
  try {
    const { companyId } = req.body;
    const userCompanyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'معرف الشركة مطلوب'
      });
    }

    // Check if user has access to this company
    if (req.user?.role !== 'SUPER_ADMIN' && companyId !== userCompanyId) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية للوصول لهذه الشركة'
      });
    }

    // Check if company already has pages
    const existingPages = await getPrisma().storePage.count({
      where: { companyId }
    });

    if (existingPages > 0) {
      return res.status(400).json({
        success: false,
        error: 'الشركة لديها صفحات بالفعل'
      });
    }

    // Default pages content - مناسب للسوق المصري
    const defaultPages = [
      {
        title: 'سياسة الشحن والتوصيل',
        slug: 'shipping-policy',
        pageType: 'SHIPPING_POLICY',
        content: `<h2>سياسة الشحن والتوصيل</h2>
<p>نوفر خدمة التوصيل لجميع محافظات جمهورية مصر العربية من خلال شركات الشحن المعتمدة.</p>

<h3>مدة التوصيل</h3>
<ul>
  <li><strong>القاهرة والجيزة:</strong> من 1 إلى 3 أيام عمل</li>
  <li><strong>الإسكندرية والدلتا:</strong> من 2 إلى 4 أيام عمل</li>
  <li><strong>الصعيد والمحافظات الأخرى:</strong> من 3 إلى 7 أيام عمل</li>
  <li><strong>الوجه البحري:</strong> من 2 إلى 5 أيام عمل</li>
</ul>

<h3>تكلفة الشحن</h3>
<p>يتم احتساب تكلفة الشحن حسب المحافظة ووزن الطلب:</p>
<ul>
  <li><strong>شحن مجاني</strong> للطلبات فوق 500 جنيه داخل القاهرة والجيزة</li>
  <li><strong>شحن مجاني</strong> للطلبات فوق 750 جنيه لباقي المحافظات</li>
  <li>رسوم الشحن داخل القاهرة والجيزة: 35 جنيه</li>
  <li>رسوم الشحن لباقي المحافظات: 50-70 جنيه حسب المحافظة</li>
</ul>

<h3>شركات الشحن</h3>
<p>نتعامل مع أفضل شركات الشحن في مصر لضمان وصول طلبك بأمان:</p>
<ul>
  <li>بوستا (Bosta)</li>
  <li>أرامكس (Aramex)</li>
  <li>فيديكس مصر (FedEx Egypt)</li>
  <li>سمسا إكسبريس (SMSA Express)</li>
  <li>DHL مصر</li>
</ul>

<h3>تتبع الطلب</h3>
<p>بعد شحن طلبك، سنرسل لك رقم التتبع عبر الواتساب والبريد الإلكتروني لمتابعة شحنتك لحظة بلحظة.</p>

<h3>ملاحظات هامة</h3>
<ul>
  <li>أيام العمل من <strong>السبت إلى الخميس</strong> (الجمعة والعطلات الرسمية إجازة)</li>
  <li>يُرجى كتابة العنوان بالتفصيل (المحافظة، المدينة، الحي، الشارع، رقم العقار)</li>
  <li>تأكد من كتابة رقم موبايل صحيح للتواصل مع المندوب</li>
  <li>في حالة عدم الرد على المندوب، سيتم إرجاع الطلب وتتحمل رسوم الشحن</li>
  <li>التوصيل متاح لجميع المحافظات بما فيها المناطق النائية</li>
</ul>`,
        order: 1,
        showInFooter: true
      },
      {
        title: 'سياسة الإرجاع والاستبدال',
        slug: 'return-policy',
        pageType: 'RETURN_POLICY',
        content: `<h2>سياسة الإرجاع والاستبدال</h2>
<p>رضاك يهمنا! نوفر لك إمكانية إرجاع أو استبدال المنتجات بكل سهولة.</p>

<h3>مدة الإرجاع والاستبدال</h3>
<ul>
  <li>يمكنك إرجاع أو استبدال المنتج خلال <strong>14 يوم</strong> من تاريخ الاستلام</li>
  <li>يجب أن يكون المنتج في حالته الأصلية دون استخدام</li>
  <li>يجب أن تكون العبوة والملصقات سليمة وغير تالفة</li>
</ul>

<h3>شروط الإرجاع</h3>
<ul>
  <li>المنتج لم يتم استخدامه أو تركيبه</li>
  <li>جميع الملحقات والكروت موجودة</li>
  <li>الفاتورة الأصلية موجودة</li>
  <li>العبوة الأصلية سليمة</li>
</ul>

<h3>المنتجات غير القابلة للإرجاع</h3>
<ul>
  <li>الملابس الداخلية ومستحضرات التجميل (لأسباب صحية)</li>
  <li>المنتجات المخصصة حسب الطلب</li>
  <li>المنتجات المخفضة بنسبة 50% أو أكثر (التخفيضات النهائية)</li>
  <li>المنتجات الإلكترونية بعد فتح العبوة (ما لم تكن معيبة)</li>
  <li>البطاقات الرقمية والاشتراكات</li>
</ul>

<h3>خطوات الإرجاع</h3>
<ol>
  <li><strong>تواصل معنا:</strong> عبر الواتساب أو البريد الإلكتروني أو الهاتف</li>
  <li><strong>احصل على رقم الإرجاع:</strong> سنرسل لك رقم مرجعي للإرجاع</li>
  <li><strong>تغليف المنتج:</strong> أعد تغليف المنتج في عبوته الأصلية</li>
  <li><strong>الشحن:</strong> أرسل المنتج عبر شركة الشحن (نتحمل تكلفة الشحن في حالة العيب)</li>
  <li><strong>الفحص:</strong> سنفحص المنتج خلال 2-3 أيام عمل</li>
  <li><strong>الاسترجاع:</strong> سيتم رد المبلغ خلال 5-7 أيام عمل بعد الموافقة</li>
</ol>

<h3>الاستبدال</h3>
<p>يمكنك استبدال المنتج بمنتج آخر من نفس القيمة أو أعلى (مع دفع الفرق) خلال 14 يوم.</p>

<h3>تكلفة الإرجاع</h3>
<ul>
  <li>في حالة <strong>العيب المصنعي:</strong> نتحمل تكلفة الشحن بالكامل</li>
  <li>في حالة <strong>عدم المطابقة:</strong> نتحمل تكلفة الشحن</li>
  <li>في حالة <strong>تغيير الرأي:</strong> العميل يتحمل تكلفة الشحن</li>
</ul>

<h3>للتواصل</h3>
<p><strong>خدمة العملاء متاحة:</strong></p>
<ul>
  <li>من السبت إلى الخميس: 9 صباحاً - 6 مساءً (بتوقيت القاهرة)</li>
  <li>الجمعة: إجازة</li>
  <li>الرد على الواتساب خلال دقائق</li>
</ul>`,
        order: 2,
        showInFooter: true
      },
      {
        title: 'سياسة الاسترجاع المالي',
        slug: 'refund-policy',
        pageType: 'REFUND_POLICY',
        content: `<h2>سياسة الاسترجاع المالي</h2>
<p>نلتزم برد المبلغ المدفوع في الحالات المستحقة وفقاً لسياستنا.</p>

<h3>متى يتم استرجاع المبلغ؟</h3>
<ul>
  <li>عند إرجاع المنتج وفقاً لسياسة الإرجاع والموافقة عليه</li>
  <li>عند إلغاء الطلب قبل الشحن</li>
  <li>عند استلام منتج تالف أو مختلف عن المطلوب</li>
  <li>في حالة عدم توفر المنتج بعد الطلب</li>
</ul>

<h3>طرق استرجاع المبلغ</h3>
<p>يتم رد المبلغ بنفس طريقة الدفع الأصلية:</p>
<ul>
  <li><strong>البطاقات الائتمانية (Visa/Mastercard):</strong> من 7 إلى 14 يوم عمل</li>
  <li><strong>فوري أو محافظ إلكترونية:</strong> من 3 إلى 5 أيام عمل</li>
  <li><strong>الدفع عند الاستلام:</strong> تحويل بنكي أو فودافون كاش خلال 5-10 أيام</li>
  <li><strong>التحويل البنكي:</strong> من 3 إلى 7 أيام عمل</li>
</ul>

<h3>المبلغ المسترجع</h3>
<ul>
  <li>سيتم رد <strong>كامل قيمة المنتج</strong> المدفوعة</li>
  <li>رسوم الشحن <strong>غير قابلة للاسترداد</strong> إلا في حالة:</li>
  <ul>
    <li>المنتج معيب أو تالف</li>
    <li>المنتج مختلف عن الموصوف</li>
    <li>خطأ من المتجر</li>
  </ul>
  <li>تكلفة إعادة الشحن يتحملها العميل (إلا في حالة العيب)</li>
</ul>

<h3>مدة معالجة الاسترجاع</h3>
<ol>
  <li>فحص المنتج المرتجع: 2-3 أيام عمل</li>
  <li>الموافقة على الاسترجاع: يوم عمل واحد</li>
  <li>معالجة الاسترجاع المالي: حسب طريقة الدفع</li>
</ol>

<h3>حالات عدم الاسترجاع</h3>
<ul>
  <li>المنتج مستخدم أو تالف بسبب سوء الاستخدام</li>
  <li>مرور أكثر من 14 يوم على الاستلام</li>
  <li>المنتج من الفئات غير القابلة للإرجاع</li>
  <li>عدم وجود الفاتورة الأصلية</li>
</ul>`,
        order: 3,
        showInFooter: true
      },
      {
        title: 'الأسئلة الشائعة',
        slug: 'faq',
        pageType: 'FAQ',
        content: `<h2>الأسئلة الشائعة</h2>

<h3>📦 عن الطلبات</h3>

<h4>كيف أطلب من المتجر؟</h4>
<p>اختر المنتجات، أضفها للسلة، أدخل بياناتك، واختر طريقة الدفع والشحن.</p>

<h4>كيف أتتبع طلبي؟</h4>
<p>سنرسل لك رقم التتبع عبر الواتساب والبريد الإلكتروني. يمكنك تتبع الشحنة من خلال موقع شركة الشحن.</p>

<h4>هل يمكن تعديل أو إلغاء الطلب؟</h4>
<p>نعم، يمكنك التعديل أو الإلغاء خلال ساعة من الطلب قبل الشحن. تواصل معنا فوراً.</p>

<h4>ماذا لو لم أكن موجوداً عند التوصيل؟</h4>
<p>سيتواصل معك المندوب. إذا لم يتم الرد، سيتم المحاولة مرة أخرى أو إرجاع الطلب.</p>

<h3>💳 عن الدفع</h3>

<h4>ما هي طرق الدفع المتاحة؟</h4>
<p>نوفر عدة طرق:</p>
<ul>
  <li><strong>الدفع عند الاستلام</strong> (كاش للمندوب)</li>
  <li><strong>البطاقات الائتمانية</strong> (Visa, Mastercard)</li>
  <li><strong>فوري</strong> (Fawry)</li>
  <li><strong>فودافون كاش</strong></li>
  <li><strong>التحويل البنكي</strong></li>
</ul>

<h4>هل الدفع الإلكتروني آمن؟</h4>
<p>نعم، نستخدم بوابات دفع معتمدة ومشفرة بأعلى معايير الأمان (SSL 256-bit).</p>

<h4>هل توجد رسوم إضافية على الدفع عند الاستلام؟</h4>
<p>قد تطبق رسوم بسيطة (10-15 جنيه) حسب المحافظة.</p>

<h3>🚚 عن الشحن</h3>

<h4>كم تستغرق مدة التوصيل؟</h4>
<ul>
  <li>القاهرة والجيزة: 1-3 أيام</li>
  <li>الإسكندرية والدلتا: 2-4 أيام</li>
  <li>باقي المحافظات: 3-7 أيام</li>
</ul>

<h4>هل الشحن مجاني؟</h4>
<p>نعم! شحن مجاني للطلبات فوق 500 جنيه (القاهرة والجيزة) و750 جنيه (باقي المحافظات).</p>

<h4>كم تكلفة الشحن؟</h4>
<ul>
  <li>القاهرة والجيزة: 35 جنيه</li>
  <li>باقي المحافظات: 50-70 جنيه</li>
</ul>

<h3>↩️ عن الإرجاع والاستبدال</h3>

<h4>هل يمكن إرجاع المنتج؟</h4>
<p>نعم، خلال 14 يوم من الاستلام بشرط أن يكون بحالته الأصلية.</p>

<h4>من يتحمل تكلفة الإرجاع؟</h4>
<ul>
  <li>المنتج معيب: نتحمل التكلفة</li>
  <li>تغيير رأي: العميل يتحمل التكلفة</li>
</ul>

<h4>متى أستلم المبلغ المسترجع؟</h4>
<p>خلال 5-14 يوم عمل حسب طريقة الدفع بعد فحص المنتج.</p>

<h3>📞 التواصل</h3>

<h4>كيف أتواصل مع خدمة العملاء؟</h4>
<ul>
  <li>واتساب: [رقم الواتساب]</li>
  <li>هاتف: [رقم الهاتف]</li>
  <li>بريد إلكتروني: [البريد]</li>
</ul>
<p>مواعيد العمل: السبت - الخميس من 9 ص إلى 6 م</p>`,
        order: 4,
        showInFooter: true
      },
      {
        title: 'طرق الدفع المتاحة',
        slug: 'payment-methods',
        pageType: 'PAYMENT_METHODS',
        content: `<h2>طرق الدفع المتاحة</h2>
<p>نوفر لك عدة طرق دفع آمنة ومريحة لتناسب احتياجاتك.</p>

<h3>💵 1. الدفع عند الاستلام (Cash on Delivery)</h3>
<p>الطريقة الأكثر شيوعاً في مصر - ادفع نقداً للمندوب عند استلام طلبك.</p>
<ul>
  <li>✅ متاح في جميع المحافظات</li>
  <li>✅ لا تحتاج بطاقة بنكية</li>
  <li>⚠️ قد تطبق رسوم إضافية (10-15 جنيه)</li>
  <li>⚠️ تأكد من وجود المبلغ كاملاً مع المندوب</li>
</ul>

<h3>💳 2. البطاقات الائتمانية والخصم</h3>
<p>ادفع بأمان باستخدام بطاقتك البنكية:</p>
<ul>
  <li><strong>Visa</strong></li>
  <li><strong>Mastercard</strong></li>
  <li><strong>Meeza</strong> (ميزة - البطاقة المصرية)</li>
</ul>
<p>🔒 جميع المعاملات مشفرة ومحمية بأعلى معايير الأمان.</p>

<h3>📱 3. المحافظ الإلكترونية</h3>

<h4>فودافون كاش (Vodafone Cash)</h4>
<p>ادفع من محفظتك الإلكترونية بسهولة وأمان.</p>

<h4>فوري (Fawry)</h4>
<p>ادفع من خلال:</p>
<ul>
  <li>تطبيق فوري</li>
  <li>ماكينات فوري المنتشرة</li>
  <li>فروع فوري</li>
</ul>

<h3>🏦 4. التحويل البنكي</h3>
<p>يمكنك التحويل مباشرة إلى حسابنا البنكي في أحد البنوك التالية:</p>
<ul>
  <li><strong>البنك الأهلي المصري (NBE)</strong></li>
  <li><strong>بنك مصر</strong></li>
  <li><strong>البنك التجاري الدولي (CIB)</strong></li>
  <li><strong>بنك القاهرة</strong></li>
  <li><strong>QNB الأهلي</strong></li>
</ul>
<p>⚠️ <strong>مهم:</strong> يرجى إرسال صورة من إيصال التحويل عبر الواتساب مع رقم الطلب لتأكيد الدفع.</p>

<h3>🔐 الأمان والحماية</h3>
<ul>
  <li>✅ جميع المعاملات مشفرة بتقنية SSL 256-bit</li>
  <li>✅ لا نحتفظ ببيانات بطاقتك الائتمانية</li>
  <li>✅ بوابات دفع معتمدة ومرخصة من البنك المركزي</li>
  <li>✅ نظام حماية من الاحتيال</li>
</ul>

<h3>💡 نصائح مهمة</h3>
<ul>
  <li>تأكد من صحة المبلغ قبل الدفع</li>
  <li>احتفظ بإيصال الدفع حتى استلام الطلب</li>
  <li>لا تشارك بيانات بطاقتك مع أي شخص</li>
  <li>في حالة أي مشكلة، تواصل معنا فوراً</li>
</ul>`,
        order: 5,
        showInFooter: true
      },
      {
        title: 'عن المتجر',
        slug: 'about-us',
        pageType: 'ABOUT_US',
        content: `<h2>عن متجرنا</h2>
<p>مرحباً بك في متجرنا الإلكتروني - وجهتك المفضلة للتسوق أونلاين في مصر!</p>

<h3>🏪 من نحن</h3>
<p>نحن متجر إلكتروني مصري متخصص في تقديم أفضل المنتجات بأعلى جودة وأفضل الأسعار. نخدم عملائنا في جميع أنحاء جمهورية مصر العربية.</p>

<h3>🎯 رؤيتنا</h3>
<p>أن نكون المتجر الإلكتروني الأول والأكثر ثقة في مصر، ونقدم تجربة تسوق استثنائية لكل عملائنا.</p>

<h3>💼 رسالتنا</h3>
<p>نسعى لتوفير تجربة تسوق سهلة وممتعة من خلال:</p>
<ul>
  <li>✅ <strong>منتجات أصلية 100%</strong> - نضمن جودة كل منتج</li>
  <li>✅ <strong>أسعار تنافسية</strong> - أفضل الأسعار في السوق</li>
  <li>✅ <strong>توصيل سريع</strong> - لجميع المحافظات</li>
  <li>✅ <strong>خدمة عملاء متميزة</strong> - نحن هنا لمساعدتك</li>
  <li>✅ <strong>دفع آمن</strong> - طرق دفع متعددة وآمنة</li>
</ul>

<h3>⭐ لماذا تختارنا؟</h3>
<ul>
  <li><strong>منتجات متنوعة:</strong> آلاف المنتجات في مختلف الفئات</li>
  <li><strong>ضمان الجودة:</strong> فحص دقيق لكل منتج قبل الشحن</li>
  <li><strong>شحن لجميع المحافظات:</strong> نصل إليك أينما كنت</li>
  <li><strong>إرجاع واستبدال سهل:</strong> خلال 14 يوم</li>
  <li><strong>عروض وخصومات:</strong> عروض مستمرة على المنتجات</li>
  <li><strong>دعم فني:</strong> فريق جاهز لمساعدتك</li>
</ul>

<h3>🌟 قيمنا</h3>
<ul>
  <li><strong>الجودة أولاً:</strong> لا نساوم على جودة المنتجات</li>
  <li><strong>رضا العميل:</strong> سعادتك هي هدفنا</li>
  <li><strong>الأمانة والشفافية:</strong> نتعامل بمصداقية تامة</li>
  <li><strong>الابتكار:</strong> نطور خدماتنا باستمرار</li>
  <li><strong>المسؤولية:</strong> نلتزم بوعودنا</li>
</ul>

<h3>📞 تواصل معنا</h3>
<p>نحن دائماً في خدمتك!</p>
<ul>
  <li>📱 <strong>واتساب:</strong> [رقم الواتساب] - رد فوري</li>
  <li>☎️ <strong>موبايل:</strong> [رقم الموبايل]</li>
  <li>📞 <strong>أرضي:</strong> [رقم الأرضي] (اختياري)</li>
  <li>✉️ <strong>إيميل:</strong> [البريد الإلكتروني]</li>
  <li>📍 <strong>العنوان:</strong> [عنوان الشركة - المحافظة، المدينة]</li>
  <li>🕐 <strong>مواعيد العمل:</strong> السبت - الخميس (9 ص - 6 م بتوقيت القاهرة)</li>
  <li>🕌 <strong>الجمعة:</strong> إجازة</li>
</ul>

<p><strong>شكراً لثقتك بنا! 🙏</strong></p>`,
        order: 6,
        showInFooter: true
      }
    ];

    // Create all default pages
    const createdPages = await getPrisma().storePage.createMany({
      data: defaultPages.map(page => ({
        ...page,
        companyId
      }))
    });

    const vectorPages = await getPrisma().storePage.findMany({
      where: {
        companyId,
        pageType: {
          in: Array.from(RAG_POLICY_PAGE_TYPES)
        }
      }
    });
    for (const page of vectorPages) {
      await syncStorePageVectorPolicy(page);
    }

    res.json({
      success: true,
      message: 'تم إنشاء الصفحات الافتراضية بنجاح',
      data: { count: createdPages.count }
    });
  } catch (error) {
    console.error('❌ Error initializing default pages:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في إنشاء الصفحات الافتراضية',
      message: error.message
    });
  }
};

/**
 * Get all store pages across all companies (Super Admin only)
 */
const getAllPagesSuperAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', pageType, isActive } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {};

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    if (pageType) {
      whereClause.pageType = pageType;
    }

    if (isActive === 'true' || isActive === 'false') {
      whereClause.isActive = isActive === 'true';
    }

    const [pages, total] = await Promise.all([
      getPrisma().storePage.findMany({
        where: whereClause,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      getPrisma().storePage.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: pages,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Error fetching all store pages:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب جميع صفحات المتاجر',
      message: error.message
    });
  }
};

module.exports = {
  getAllPages,
  getPageById,
  getPageBySlug,
  newsletterSubscribe,
  createPage,
  updatePage,
  deletePage,
  togglePageStatus,
  initializeDefaultPages,
  getAllPagesSuperAdmin
};
