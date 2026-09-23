const { getSharedPrismaClient } = require("./sharedDatabase");
const taskNotificationService = require("./taskNotificationService");
const { v4: uuidv4 } = require("uuid");

/**
 * Service for handling recurring task logic (حساب المواعيد وتوليد المهام المتكررة)
 */
const recurringTaskService = {
  /**
   * Parse recurring rule safely from string or object
   */
  parseRule: (ruleInput) => {
    if (!ruleInput) return null;
    if (typeof ruleInput === "object") return ruleInput;
    try {
      return JSON.parse(ruleInput);
    } catch (e) {
      console.warn("[recurringTaskService] Failed to parse recurringRule JSON:", e.message);
      return null;
    }
  },

  /**
   * Calculate next due date and start date based on current dates and recurrence rule
   */
  calculateNextDates: (currentStartDate, currentDueDate, rule) => {
    if (!rule || !rule.enabled) return null;

    const baseDueDate = currentDueDate ? new Date(currentDueDate) : new Date();
    const nextDueDate = new Date(baseDueDate);
    const interval = Math.max(1, Number(rule.interval) || 1);

    switch (rule.frequency) {
      case "daily":
        nextDueDate.setDate(nextDueDate.getDate() + interval);
        break;

      case "weekly": {
        const daysOfWeek = Array.isArray(rule.daysOfWeek) && rule.daysOfWeek.length > 0
          ? [...rule.daysOfWeek].map(Number).sort((a, b) => a - b)
          : null;

        if (daysOfWeek && daysOfWeek.length > 0) {
          const currentDay = baseDueDate.getDay();
          // Find next day in the same week
          const nextDayInWeek = daysOfWeek.find((d) => d > currentDay);

          if (nextDayInWeek !== undefined) {
            const diffDays = nextDayInWeek - currentDay;
            nextDueDate.setDate(nextDueDate.getDate() + diffDays);
          } else {
            // Jump to first day of next interval weeks
            const firstDayOfNextCycle = daysOfWeek[0];
            const daysUntilEndOfWeek = 7 - currentDay;
            const additionalWeeksDays = (interval - 1) * 7;
            const totalDaysToAdd = daysUntilEndOfWeek + additionalWeeksDays + firstDayOfNextCycle;
            nextDueDate.setDate(nextDueDate.getDate() + totalDaysToAdd);
          }
        } else {
          nextDueDate.setDate(nextDueDate.getDate() + 7 * interval);
        }
        break;
      }

      case "monthly":
        nextDueDate.setMonth(nextDueDate.getMonth() + interval);
        if (rule.dayOfMonth && Number(rule.dayOfMonth) >= 1 && Number(rule.dayOfMonth) <= 31) {
          nextDueDate.setDate(Number(rule.dayOfMonth));
        }
        break;

      case "yearly":
        nextDueDate.setFullYear(nextDueDate.getFullYear() + interval);
        break;

      default:
        nextDueDate.setDate(nextDueDate.getDate() + interval);
    }

    // Check endType conditions
    if (rule.endType === "date" && rule.endDate) {
      const endDateTime = new Date(rule.endDate).setHours(23, 59, 59, 999);
      if (nextDueDate.getTime() > endDateTime) {
        console.log("[recurringTaskService] Recurrence reached endDate:", rule.endDate);
        return null;
      }
    }

    const currentCount = Number(rule.currentCount) || 1;
    if (rule.endType === "count" && rule.endCount) {
      if (currentCount >= Number(rule.endCount)) {
        console.log(`[recurringTaskService] Recurrence reached max count (${currentCount}/${rule.endCount})`);
        return null;
      }
    }

    // Calculate next start date keeping original task duration window
    let nextStartDate = null;
    if (currentStartDate && currentDueDate) {
      const durationMs = Math.max(0, new Date(currentDueDate).getTime() - new Date(currentStartDate).getTime());
      nextStartDate = new Date(nextDueDate.getTime() - durationMs);
    } else {
      nextStartDate = new Date(nextDueDate.getTime() - 24 * 60 * 60 * 1000);
    }

    return {
      nextStartDate,
      nextDueDate,
      nextCount: currentCount + 1,
    };
  },

  /**
   * Handle task completion - spawn the next occurrence if recurring
   */
  handleTaskCompletion: async (completedTask, actorUserId) => {
    try {
      if (!completedTask || !completedTask.isRecurring) {
        return null;
      }

      const rule = recurringTaskService.parseRule(completedTask.recurringRule);
      if (!rule || !rule.enabled) {
        return null;
      }

      const prisma = getSharedPrismaClient();

      // Guard: Prevent duplicate spawn if a pending recurrence already exists
      const existingPendingSpawn = await prisma.task.findFirst({
        where: {
          companyId: completedTask.companyId,
          status: "PENDING",
          OR: [
            { parentTaskId: completedTask.parentTaskId || completedTask.id },
            { id: completedTask.parentTaskId || completedTask.id },
          ],
          title: completedTask.title,
          isRecurring: true,
        },
      });

      if (existingPendingSpawn && existingPendingSpawn.id !== completedTask.id) {
        console.log(`[recurringTaskService] Pending occurrence already exists (${existingPendingSpawn.id}), skipping spawn.`);
        return existingPendingSpawn;
      }

      const dates = recurringTaskService.calculateNextDates(
        completedTask.startDate,
        completedTask.dueDate,
        rule
      );

      if (!dates) {
        console.log(`[recurringTaskService] Task ${completedTask.id} has ended its recurrence cycle.`);
        return null;
      }

      const updatedRule = {
        ...rule,
        currentCount: dates.nextCount,
      };

      const parentTaskId = completedTask.parentTaskId || completedTask.id;
      const newTaskId = uuidv4();

      const nextTask = await prisma.task.create({
        data: {
          id: newTaskId,
          companyId: completedTask.companyId,
          projectId: completedTask.projectId || null,
          categoryId: completedTask.categoryId || null,
          goalId: completedTask.goalId || null,
          parentTaskId: parentTaskId,
          title: completedTask.title,
          description: completedTask.description,
          status: "PENDING",
          priority: completedTask.priority || "MEDIUM",
          type: completedTask.type || "general",
          assignedTo: completedTask.assignedTo,
          createdBy: completedTask.createdBy || actorUserId,
          startDate: dates.nextStartDate,
          dueDate: dates.nextDueDate,
          estimatedHours: completedTask.estimatedHours || 0,
          actualHours: 0,
          progress: 0,
          tags: typeof completedTask.tags === "string" ? completedTask.tags : "[]",
          dependencies: completedTask.dependencies || null,
          isRecurring: true,
          recurringRule: JSON.stringify(updatedRule),
        },
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, phone: true } },
          creator: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      console.log(`🔁 [recurringTaskService] Successfully created next recurring task "${nextTask.title}" (${nextTask.id}) due at ${dates.nextDueDate.toISOString()}`);

      // Notify stakeholders about new recurring cycle
      try {
        await taskNotificationService.notifyTaskStakeholders({
          companyId: nextTask.companyId,
          task: nextTask,
          actorUserId: actorUserId || completedTask.assignedTo,
          type: "task_created",
          title: "تكرار مهمة تلقائياً",
          message: `تم إنشاء دورة التكرار الجديدة للمهمة "${nextTask.title}" وموعد استحقاقها (${new Date(dates.nextDueDate).toLocaleDateString("ar-EG")})`,
          includeAssignee: true,
          includeCreator: true,
          includeWatchers: true,
          whatsappData: {
            templateName: "TASK_ASSIGNED",
            taskTitle: nextTask.title,
            variables: {
              taskTitle: nextTask.title,
              assigneeName: `${nextTask.assignee?.firstName || ""} ${nextTask.assignee?.lastName || ""}`.trim(),
              dueDate: new Date(dates.nextDueDate).toLocaleDateString("ar-EG"),
              priority: nextTask.priority,
            },
          },
          logActivity: true,
          activityDescription: "تم توليد النسخة المتكررة الجديدة تلقائياً عند إنجاز الدورة السابقة",
        });
      } catch (notifErr) {
        console.warn("[recurringTaskService] Failed to send recurrence notifications:", notifErr.message);
      }

      return nextTask;
    } catch (error) {
      console.error("[recurringTaskService] Error handling task completion recurrence:", error);
      return null;
    }
  },

  /**
   * Scan for active recurring tasks whose due date has arrived/passed and need the next recurrence
   */
  processScheduledRecurringTasks: async () => {
    const prisma = getSharedPrismaClient();
    try {
      const now = new Date();
      // Find completed or overdue recurring tasks
      const recurringTasks = await prisma.task.findMany({
        where: {
          isRecurring: true,
          recurringRule: { not: null },
          status: "COMPLETED",
          completedDate: { lte: now },
        },
        orderBy: { completedDate: "desc" },
      });

      console.log(`🔁 [recurringTaskService] Processing ${recurringTasks.length} completed recurring tasks for recurrence...`);

      let spawnedCount = 0;
      for (const task of recurringTasks) {
        const spawned = await recurringTaskService.handleTaskCompletion(task);
        if (spawned) spawnedCount++;
      }

      return { totalFound: recurringTasks.length, spawnedCount };
    } catch (error) {
      console.error("[recurringTaskService] Error in processScheduledRecurringTasks:", error);
      return { error: error.message };
    }
  },
};

module.exports = recurringTaskService;
