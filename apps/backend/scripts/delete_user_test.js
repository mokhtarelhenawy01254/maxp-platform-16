const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');

async function deleteUser() {
    await initializeSharedDatabase();
    const prisma = getSharedPrismaClient();
    const userId = 'cmiug0rm70vbdjuewr9cuiy82'; // mokhtar@mokhtar.com
    
    console.log(`\nðŸ—‘ï¸ Starting deletion test for user: ${userId}\n`);
    
    try {
        // Get user info first
        const user = await prisma.user.findUnique({ 
            where: { id: userId },
            select: { email: true, role: true, firstName: true, lastName: true }
        });
        
        if (!user) {
            console.log('âŒ User not found');
            process.exit(1);
        }
        
        console.log(`ðŸ“§ Email: ${user.email}`);
        console.log(`ðŸŽ­ Role: ${user.role}`);
        console.log(`ðŸ‘¤ Name: ${user.firstName} ${user.lastName}\n`);
        
        // Delete all related records in order
        
        // 1. Task-related records
        console.log('ðŸ”„ Deleting task-related records...');
        await prisma.taskActivity.deleteMany({ where: { userId } });
        await prisma.taskAttachment.deleteMany({ where: { userId } });
        await prisma.taskChecklistItem.deleteMany({ where: { completedBy: userId } });
        await prisma.taskComment.deleteMany({ where: { userId } });
        await prisma.taskNotification.deleteMany({ where: { userId } });
        await prisma.taskWatcher.deleteMany({ where: { userId } });
        console.log('âœ… Task-related records deleted');
        
        // 2. Time tracking
        console.log('ðŸ”„ Deleting time entries...');
        await prisma.timeEntry.deleteMany({ where: { userId } });
        console.log('âœ… Time entries deleted');
        
        // 3. Support tickets
        console.log('ðŸ”„ Updating support tickets...');
        await prisma.supportMessage.deleteMany({ where: { senderId: userId } });
        await prisma.supportTicket.updateMany({ 
            where: { assignedUserId: userId }, 
            data: { assignedUserId: null } 
        });
        // Note: userId in SupportTicket has onDelete: Cascade, so tickets will be deleted automatically
        console.log('âœ… Support tickets updated');
        
        // 4. HR-related records
        console.log('ðŸ”„ Deleting HR records...');
        await prisma.attendance.deleteMany({ where: { userId } });
        await prisma.shiftAssignment.deleteMany({ where: { userId } });
        await prisma.hRAuditLog.deleteMany({ where: { actorId: userId } });
        console.log('âœ… HR records deleted');
        
        // 5. Rewards & Kudos
        console.log('ðŸ”„ Deleting rewards records...');
        await prisma.rewardRecord.deleteMany({ where: { userId } });
        await prisma.rewardEligibilityLog.deleteMany({ where: { userId } });
        await prisma.kudos.deleteMany({ where: { OR: [{ fromUserId: userId }, { toUserId: userId }] } });
        console.log('âœ… Rewards records deleted');
        
        // 6. Other relations
        console.log('ðŸ”„ Deleting other user records...');
        await prisma.activity.deleteMany({ where: { userId } });
        await prisma.customerNote.deleteMany({ where: { authorId: userId } });
        await prisma.callAttemptLog.deleteMany({ where: { userId } });
        await prisma.returnActivityLog.deleteMany({ where: { userId } });
        await prisma.returnContactAttempt.deleteMany({ where: { userId } });
        await prisma.clearanceChecklist.updateMany({ where: { completedBy: userId }, data: { completedBy: null } });
        console.log('âœ… Other user records deleted');
        
        // 7. Image & Text galleries
        console.log('ðŸ”„ Deleting gallery records...');
        await prisma.imageGallery.deleteMany({ where: { userId } });
        await prisma.imageStudioHistory.deleteMany({ where: { userId } });
        await prisma.textGallery.deleteMany({ where: { userId } });
        console.log('âœ… Gallery records deleted');
        
        // 8. DevTeamMember
        console.log('ðŸ”„ Deleting DevTeamMember...');
        await prisma.devTeamMember.deleteMany({ where: { userId } });
        console.log('âœ… DevTeamMember deleted');
        
        // 9. UserCompany relations
        console.log('ðŸ”„ Deleting UserCompany relations...');
        await prisma.userCompany.deleteMany({ where: { userId } });
        console.log('âœ… UserCompany relations deleted');
        
        // 10. ActivityLogs & Notifications
        console.log('ðŸ”„ Deleting ActivityLogs & Notifications...');
        await prisma.activityLog.deleteMany({ where: { userId } });
        await prisma.notification.deleteMany({ where: { userId } });
        console.log('âœ… ActivityLogs & Notifications deleted');
        
        // 11. Delete Tasks assigned to or created by user
        console.log('ðŸ”„ Deleting tasks...');
        await prisma.task.deleteMany({ where: { OR: [{ assignedTo: userId }, { createdBy: userId }] } });
        console.log('âœ… Tasks deleted');
        
        // 12. Delete the user
        console.log('ðŸ”„ Deleting user...');
        await prisma.user.delete({ where: { id: userId } });
        console.log('âœ… User deleted successfully!\n');
        
        console.log('ðŸŽ‰ Deletion completed without errors!');
        
    } catch (error) {
        console.error('\nâŒ ERROR during deletion:');
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('\nFull error:', error);
    }
    
    process.exit(0);
}

deleteUser().catch(console.error);

