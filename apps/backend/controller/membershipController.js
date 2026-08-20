const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');

/**
 * 👤 Membership Controller
 * Handles storefront member registrations and listings.
 */

exports.registerMember = async (req, res) => {
  try {
    const companyId = req.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد المتجر'
      });
    }

    const prisma = await getSharedPrismaClientAsync();
    const {
      fullName,
      constituency,
      politicalParty,
      position,
      birthDate,
      gender,
      vision,
      photo,
      education,
      phone,
      email
    } = req.body;

    if (!fullName) {
      return res.status(400).json({
        success: false,
        message: 'الاسم الكامل مطلوب'
      });
    }

    // Prepare data
    const memberData = {
      companyId,
      fullName,
      constituency,
      politicalParty,
      position,
      birthDate: birthDate ? new Date(birthDate) : null,
      vision,
      photo,
      education: education || [],
      status: 'PENDING'
    };

    // Handle gender enum
    if (gender) {
      const upperGender = gender.toUpperCase();
      if (['MALE', 'FEMALE'].includes(upperGender)) {
        memberData.gender = upperGender;
      }
    }

    // Create the member
    const member = await prisma.member.create({
      data: memberData
    });

    const fullNameParts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    const customerFirstName = fullNameParts.shift() || 'عضو';
    const customerLastName = fullNameParts.join(' ') || 'جديد';
    let linkedCustomer = null;

    if (phone || email) {
      const duplicateFilters = [];
      if (phone) {
        duplicateFilters.push({ phone });
        const canonicalPhone = require('../utils/phoneNormalization').toCanonicalE164(phone);
        if (canonicalPhone) duplicateFilters.push({ phoneNormalized: canonicalPhone });
      }
      if (email) duplicateFilters.push({ email });

      linkedCustomer = await prisma.customer.findFirst({
        where: {
          companyId,
          OR: duplicateFilters,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          tags: true,
          metadata: true,
        }
      });

      const nextMetadata = {
        membershipRegistration: {
          memberId: member.id,
          registeredAt: new Date().toISOString(),
        }
      };

      if (linkedCustomer?.id) {
        linkedCustomer = await prisma.customer.update({
          where: { id: linkedCustomer.id },
          data: {
            firstName: linkedCustomer.firstName || customerFirstName,
            lastName: linkedCustomer.lastName || customerLastName,
            phone: linkedCustomer.phone || phone || null,
            email: linkedCustomer.email || email || null,
            status: 'LEAD',
            tags: JSON.stringify(['membership', 'lead']),
            metadata: JSON.stringify(nextMetadata),
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          }
        });
      } else {
        const { safeCreateCustomer, buildPhoneWhere } = require('../utils/customerIdentity');
        linkedCustomer = await safeCreateCustomer(
          prisma,
          {
            data: {
              companyId,
              firstName: customerFirstName,
              lastName: customerLastName,
              phone: phone || null,
              phoneNormalized: phone ? require('../utils/phoneNormalization').toCanonicalE164(phone) : null,
              email: email || null,
              status: 'LEAD',
              tags: JSON.stringify(['membership', 'lead']),
              metadata: JSON.stringify(nextMetadata),
            },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            }
          },
          phone ? buildPhoneWhere(phone, companyId) : (email ? { companyId, email } : null)
        );
      }
    }

    const recipientPhone = linkedCustomer?.phone || phone || '';
    const recipientEmail = linkedCustomer?.email || email || '';
    const notificationTasks = [
      recipientPhone
        ? WhatsAppNotificationService.sendNewSignupWelcomeNotification({
            companyId,
            recipientPhone,
            recipientName: fullName,
            email: recipientEmail,
            customerId: linkedCustomer?.id || null,
            signupType: 'membership_member'
          })
        : null,
      WhatsAppNotificationService.sendNewSignupAdminAlertNotification({
        companyId,
        recipientName: fullName,
        recipientPhone,
        email: recipientEmail,
        signupType: 'membership_member',
        audience: 'company-admins'
      })
    ].filter(Boolean);

    Promise.allSettled(notificationTasks).catch((notificationError) => {
      console.error('❌ [MEMBERSHIP] Failed to queue WhatsApp notifications:', notificationError);
    });

    return res.status(201).json({
      success: true,
      message: 'تم تسجيل العضو بنجاح',
      data: member
    });
  } catch (error) {
    console.error('❌ [MEMBERSHIP] Error registering member:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في تسجيل العضو',
      error: error.message
    });
  }
};
