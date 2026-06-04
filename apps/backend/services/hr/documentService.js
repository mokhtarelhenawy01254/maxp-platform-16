/**
 * 📄 Employee Document Service
 * خدمة إدارة مستندات الموظفين
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const path = require('path');
const fs = require('fs').promises;

class DocumentService {
  constructor() {
    // Don't initialize prisma here - get it dynamically
    this.documentsDir = path.join(__dirname, '../../public/uploads/hr/documents');
    this.initDirectory();
  }

  get prisma() {
    return getSharedPrismaClient();
  }

  async initDirectory() {
    try {
      await fs.mkdir(this.documentsDir, { recursive: true });
    } catch (error) {
      console.error('❌ Error creating documents directory:', error);
    }
  }

  /**
   * إنشاء مستند جديد
   */
  async createDocument(companyId, employeeId, data) {
    try {
      // التحقق من وجود الموظف (User)
      const employee = await this.prisma.user.findFirst({
        where: { id: employeeId, companyId }
      });

      if (!employee) {
        throw new Error('الموظف غير موجود');
      }

      const document = await this.prisma.employeeDocument.create({
        data: {
          companyId,
          employeeId,
          name: data.name,
          type: data.type || 'other',
          fileUrl: data.fileUrl,
          fileSize: data.fileSize,
          mimeType: data.mimeType,
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
          notes: data.notes
        },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      });
      // Send WhatsApp notification to owner
      setImmediate(async () => {
        try {
          const hrOwnerNotificationAgent = require('./hrOwnerNotificationAgent');
          await hrOwnerNotificationAgent.sendOwnerNotification({
            companyId,
            employeeName: employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() : 'موظف',
            actionType: 'رفع/تحديث مستند',
            details: `المستند: ${data.name || 'غير محدد'}\nالنوع: ${data.type || 'أخرى'}\nملاحظات: ${data.notes || 'لا يوجد'}`,
            requiresApproval: false
          });
        } catch (waOwnerError) {
          console.error('❌ [Document-Owner-Notify] Error:', waOwnerError);
        }
      });

      return document;
    } catch (error) {
      console.error('❌ Error creating document:', error);
      throw error;
    }
  }

  /**
   * جلب جميع مستندات موظف
   */
  async getEmployeeDocuments(companyId, employeeId, options = {}) {
    try {
      const { type, expiredOnly } = options;

      const where = {
        companyId,
        employeeId
      };

      if (type && type !== 'all') {
        where.type = type;
      }

      if (expiredOnly) {
        where.expiryDate = { lte: new Date() };
      }

      const documents = await this.prisma.employeeDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      });

      return documents;
    } catch (error) {
      console.error('❌ Error getting documents:', error);
      throw error;
    }
  }

  /**
   * جلب مستند بالـ ID
   */
  async getDocumentById(companyId, documentId) {
    try {
      const document = await this.prisma.employeeDocument.findFirst({
        where: { id: documentId, companyId },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      });

      if (!document) {
        throw new Error('المستند غير موجود');
      }

      return document;
    } catch (error) {
      console.error('❌ Error getting document:', error);
      throw error;
    }
  }

  /**
   * تحديث مستند
   */
  async updateDocument(companyId, documentId, data) {
    try {
      const existing = await this.prisma.employeeDocument.findFirst({
        where: { id: documentId, companyId }
      });

      if (!existing) {
        throw new Error('المستند غير موجود');
      }

      const updateData = {};
      if (data.name) updateData.name = data.name;
      if (data.type) updateData.type = data.type;
      if (data.expiryDate) updateData.expiryDate = new Date(data.expiryDate);
      if (data.notes !== undefined) updateData.notes = data.notes;

      const document = await this.prisma.employeeDocument.update({
        where: { id: documentId },
        data: updateData,
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      });

      return document;
    } catch (error) {
      console.error('❌ Error updating document:', error);
      throw error;
    }
  }

  /**
   * التحقق من مستند
   */
  async verifyDocument(companyId, documentId, verifiedBy) {
    try {
      const document = await this.prisma.employeeDocument.findFirst({
        where: { id: documentId, companyId }
      });

      if (!document) {
        throw new Error('المستند غير موجود');
      }

      const updated = await this.prisma.employeeDocument.update({
        where: { id: documentId },
        data: {
          isVerified: true,
          verifiedBy,
          verifiedAt: new Date()
        }
      });

      return updated;
    } catch (error) {
      console.error('❌ Error verifying document:', error);
      throw error;
    }
  }

  /**
   * حذف مستند
   */
  async deleteDocument(companyId, documentId) {
    try {
      const document = await this.prisma.employeeDocument.findFirst({
        where: { id: documentId, companyId }
      });

      if (!document) {
        throw new Error('المستند غير موجود');
      }

      // حذف الملف من السيرفر إن وجد
      if (document.fileUrl) {
        try {
          const filePath = path.join(__dirname, '../../public', document.fileUrl);
          await fs.unlink(filePath);
        } catch (error) {
          console.warn('⚠️ Could not delete file:', error.message);
        }
      }

      await this.prisma.employeeDocument.delete({
        where: { id: documentId }
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting document:', error);
      throw error;
    }
  }

  /**
   * جلب المستندات المنتهية
   */
  async getExpiredDocuments(companyId, daysBeforeExpiry = 30) {
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + daysBeforeExpiry);

      const documents = await this.prisma.employeeDocument.findMany({
        where: {
          companyId,
          expiryDate: {
            lte: expiryDate,
            gte: new Date()
          }
        },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        },
        orderBy: { expiryDate: 'asc' }
      });

      return documents;
    } catch (error) {
      console.error('❌ Error getting expired documents:', error);
      throw error;
    }
  }

  /**
   * إحصائيات المستندات
   */
  async getDocumentStats(companyId, employeeId = null) {
    try {
      const where = { companyId };
      if (employeeId) where.employeeId = employeeId;

      const [total, byType, verified, expired, expiringSoon] = await Promise.all([
        this.prisma.employeeDocument.count({ where }),
        this.prisma.employeeDocument.groupBy({
          by: ['type'],
          where,
          _count: true
        }),
        this.prisma.employeeDocument.count({ where: { ...where, isVerified: true } }),
        this.prisma.employeeDocument.count({
          where: {
            ...where,
            expiryDate: { lte: new Date() }
          }
        }),
        this.prisma.employeeDocument.count({
          where: {
            ...where,
            expiryDate: {
              lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              gte: new Date()
            }
          }
        })
      ]);

      return {
        total,
        byType,
        verified,
        expired,
        expiringSoon
      };
    } catch (error) {
      console.error('❌ Error getting document stats:', error);
      throw error;
    }
  }
}

module.exports = new DocumentService();















































