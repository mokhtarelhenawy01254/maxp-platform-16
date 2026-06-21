import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import { useTimer } from "../../contexts/TimerContext";
import {
  ClockIcon,
  PlayIcon,
  StopIcon,
  PauseIcon,
  PlusIcon,
  TrashIcon,
  FolderIcon,
  UserGroupIcon,
  ChartBarIcon,
  ListBulletIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface TaskOption {
  id: string;
  title: string;
  projectName: string | null;
  status: string;
}

interface TimerGroup {
  id: string;
  name: string;
  description: string | null;
  isRunning: boolean;
  startTime: string | null;
  dev_tasks: { id: string; title: string; status: string }[];
}

interface ActiveTimerTask {
  id: string;
  taskId: string;
  taskTitle: string;
  taskPriority: string;
  taskStatus: string;
  projectName: string | null;
  memberName: string;
  memberId: string;
  startTime: string;
  duration: number;
  isRunning: boolean;
  isPaused: boolean;
  elapsedMinutes: number;
}

interface WorkingTimeData {
  totalMinutes: number;
  totalHours: number;
  mergedIntervalCount: number;
  perTask: {
    taskId: string;
    totalMinutes: number;
    intervals: { start: string; end: string; isRunning: boolean; isPaused: boolean }[];
  }[];
}

const DevTimerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { activeTimers, startTimer, stopTimer, pauseTimer, resumeTimer, elapsedSecondsByTask } = useTimer();

  const [allActiveTimers, setAllActiveTimers] = useState<ActiveTimerTask[]>([]);
  const [groups, setGroups] = useState<TimerGroup[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [workingTime, setWorkingTime] = useState<WorkingTimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const [showAddTasks, setShowAddTasks] = useState<string | null>(null);
  const [quickTaskId, setQuickTaskId] = useState("");

  useEffect(() => {
    fetchAll();
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAll = async () => {
    const headers = tokenManager.createAuthHeaders();
    await Promise.all([
      fetchActiveTimers(headers),
      fetchGroups(headers),
      fetchTasks(headers),
      fetchWorkingTime(headers),
    ]);
    setLoading(false);
  };

  const fetchActiveTimers = async (headers: HeadersInit) => {
    try {
      const res = await fetch(buildApiUrl("super-admin/dev/timer/all-active"), { headers });
      const data = await res.json();
      if (data.success) setAllActiveTimers(data.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchGroups = async (headers: HeadersInit) => {
    try {
      const res = await fetch(buildApiUrl("super-admin/dev/timer/groups"), { headers });
      const data = await res.json();
      if (data.success) setGroups(data.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchTasks = async (headers: HeadersInit) => {
    try {
      const res = await fetch(buildApiUrl("super-admin/dev/tasks?limit=100"), { headers });
      const data = await res.json();
      if (data.success) setTasks(data.data?.tasks || data.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchWorkingTime = async (headers: HeadersInit) => {
    try {
      const res = await fetch(buildApiUrl("super-admin/dev/timer/total-working-time"), { headers });
      const data = await res.json();
      if (data.success) setWorkingTime(data.data);
    } catch (err) { console.error(err); }
  };

  const headers = tokenManager.createAuthHeaders();

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const res = await fetch(buildApiUrl("super-admin/dev/timer/groups"), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName, description: newGroupDesc, taskIds: selectedTaskIds }),
      });
      const data = await res.json();
      if (data.success) {
        setGroups(prev => [data.data, ...prev]);
        setShowCreateGroup(false);
        setNewGroupName("");
        setNewGroupDesc("");
        setSelectedTaskIds([]);
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("حذف هذه المجموعة؟")) return;
    try {
      const res = await fetch(buildApiUrl(`super-admin/dev/timer/groups/${id}`), {
        method: "DELETE",
        headers,
      });
      if (res.ok) setGroups(prev => prev.filter(g => g.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleStartGroup = async (id: string) => {
    try {
      const res = await fetch(buildApiUrl(`super-admin/dev/timer/groups/${id}/timer/start`), {
        method: "POST",
        headers,
      });
      const data = await res.json();
      if (data.success) {
        setGroups(prev => prev.map(g => g.id === id ? { ...g, isRunning: true, startTime: data.data.startTime } : g));
        fetchAll();
      }
    } catch (err) { console.error(err); }
  };

  const handleStopGroup = async (id: string) => {
    try {
      const res = await fetch(buildApiUrl(`super-admin/dev/timer/groups/${id}/timer/stop`), {
        method: "POST",
        headers,
      });
      if (res.ok) {
        setGroups(prev => prev.map(g => g.id === id ? { ...g, isRunning: false, startTime: null } : g));
        fetchAll();
      }
    } catch (err) { console.error(err); }
  };

  const handleAddTasksToGroup = async (groupId: string) => {
    if (selectedTaskIds.length === 0) return;
    try {
      const res = await fetch(buildApiUrl(`super-admin/dev/timer/groups/${groupId}/tasks`), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds: selectedTaskIds }),
      });
      const data = await res.json();
      if (data.success) {
        setGroups(prev => prev.map(g => g.id === groupId ? data.data : g));
        setShowAddTasks(null);
        setSelectedTaskIds([]);
      }
    } catch (err) { console.error(err); }
  };

  const handleRemoveTask = async (groupId: string, taskId: string) => {
    try {
      const res = await fetch(buildApiUrl(`super-admin/dev/timer/groups/${groupId}/tasks/${taskId}`), {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, dev_tasks: g.dev_tasks.filter(t => t.id !== taskId) } : g));
      }
    } catch (err) { console.error(err); }
  };

  const handleQuickStart = async () => {
    if (!quickTaskId) return;
    const task = tasks.find(t => t.id === quickTaskId);
    if (task) {
      await startTimer(task.id, task.title, task.projectName || undefined);
      setQuickTaskId("");
      fetchAll();
    }
  };

  const handleQuickStartGroup = async (group: TimerGroup) => {
    if (group.isRunning) {
      await handleStopGroup(group.id);
    } else {
      await handleStartGroup(group.id);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatElapsedTime = (startTime: string, isPaused: boolean) => {
    if (isPaused) return "⏸️ متوقف";
    const elapsed = Math.floor((currentTime - new Date(startTime).getTime()) / 1000);
    return formatTime(elapsed);
  };

  const ungroupedTasks = useMemo(() => {
    const groupedTaskIds = new Set(groups.flatMap(g => g.dev_tasks.map(t => t.id)));
    return tasks.filter(t => !groupedTaskIds.has(t.id));
  }, [tasks, groups]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4" dir={i18n.dir()}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ClockIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            لوحة التحكم - المؤقتات
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            إدارة شاملة للمؤقتات والمجموعات
          </p>
        </div>
        <button
          onClick={fetchAll}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          تحديث
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Groups + Quick Timer */}
        <div className="space-y-6">
          {/* Quick Timer */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
              <PlayIcon className="h-5 w-5 text-green-600" />
              مؤقت سريع
            </h2>
            <div className="flex gap-2">
              <select
                value={quickTaskId}
                onChange={e => setQuickTaskId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">اختر مهمة...</option>
                {ungroupedTasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
              <button
                onClick={handleQuickStart}
                disabled={!quickTaskId}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <PlayIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Timer Groups */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <UserGroupIcon className="h-5 w-5 text-purple-600" />
                مجموعات المؤقت
                {groups.length > 0 && (
                  <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs px-2 py-0.5 rounded-full">
                    {groups.length}
                  </span>
                )}
              </h2>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                جديد
              </button>
            </div>

            {showCreateGroup && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <input
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  placeholder="اسم المجموعة"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-2 text-sm bg-white dark:bg-gray-900"
                />
                <input
                  value={newGroupDesc}
                  onChange={e => setNewGroupDesc(e.target.value)}
                  placeholder="الوصف (اختياري)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-2 text-sm bg-white dark:bg-gray-900"
                />
                <div className="max-h-32 overflow-y-auto mb-2 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                  {ungroupedTasks.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-2">لا توجد مهام متاحة</p>
                  ) : (
                    ungroupedTasks.map(t => (
                      <label key={t.id} className="flex items-center gap-2 py-1 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-1">
                        <input
                          type="checkbox"
                          checked={selectedTaskIds.includes(t.id)}
                          onChange={e => {
                            if (e.target.checked) setSelectedTaskIds(prev => [...prev, t.id]);
                            else setSelectedTaskIds(prev => prev.filter(id => id !== t.id));
                          }}
                          className="rounded"
                        />
                        <span className="truncate">{t.title}</span>
                      </label>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCreateGroup} className="flex-1 px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700">
                    إنشاء
                  </button>
                  <button onClick={() => { setShowCreateGroup(false); setNewGroupName(""); setSelectedTaskIds([]); }} className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                    إلغاء
                  </button>
                </div>
              </div>
            )}

            {groups.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">لا توجد مجموعات بعد</p>
            ) : (
              <div className="space-y-3">
                {groups.map(group => (
                  <div key={group.id} className={`border rounded-lg p-4 transition-all ${group.isRunning ? "border-green-500 bg-green-50 dark:bg-green-900/10" : "border-gray-200 dark:border-gray-700"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {group.isRunning && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
                        <span className="font-bold text-gray-900 dark:text-gray-100">{group.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {group.isRunning ? (
                          <button onClick={() => handleStopGroup(group.id)} className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg hover:bg-red-200">
                            <StopIcon className="h-4 w-4" />
                          </button>
                        ) : (
                          <button onClick={() => handleStartGroup(group.id)} disabled={group.dev_tasks.length === 0} className="p-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg hover:bg-green-200 disabled:opacity-50">
                            <PlayIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => { setShowAddTasks(group.id); setSelectedTaskIds([]); }} className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg hover:bg-blue-200">
                          <PlusIcon className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeleteGroup(group.id)} className="p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-lg hover:bg-red-100 hover:text-red-600">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {group.description && <p className="text-xs text-gray-500 mb-2">{group.description}</p>}

                    <div className="text-xs text-gray-500 mb-2">
                      {group.dev_tasks.length} مهمة
                      {group.isRunning && group.startTime && (
                        <span className="mr-2 text-green-600 font-bold">
                          ← {formatElapsedTime(group.startTime, false)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {group.dev_tasks.map(task => (
                        <span key={task.id} className="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                          <span className="truncate max-w-[120px]">{task.title}</span>
                          <button onClick={() => handleRemoveTask(group.id, task.id)} className="text-gray-400 hover:text-red-500">
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>

                    {showAddTasks === group.id && (
                      <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 mb-1">اختر مهام للإضافة:</p>
                        <div className="max-h-24 overflow-y-auto">
                          {ungroupedTasks.filter(t => !group.dev_tasks.some(gt => gt.id === t.id)).length === 0 ? (
                            <p className="text-xs text-gray-400">كل المهام موجودة</p>
                          ) : (
                            ungroupedTasks.filter(t => !group.dev_tasks.some(gt => gt.id === t.id)).map(t => (
                              <label key={t.id} className="flex items-center gap-2 py-0.5 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedTaskIds.includes(t.id)}
                                  onChange={e => {
                                    if (e.target.checked) setSelectedTaskIds(prev => [...prev, t.id]);
                                    else setSelectedTaskIds(prev => prev.filter(id => id !== t.id));
                                  }}
                                  className="rounded"
                                />
                                {t.title}
                              </label>
                            ))
                          )}
                        </div>
                        <div className="flex gap-1 mt-2">
                          <button onClick={() => handleAddTasksToGroup(group.id)} className="flex-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
                            إضافة
                          </button>
                          <button onClick={() => setShowAddTasks(null)} className="px-2 py-1 border border-gray-300 text-xs rounded hover:bg-gray-100">
                            إلغاء
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Middle Column: Active Timers */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
              <ListBulletIcon className="h-5 w-5 text-indigo-600" />
              المؤقتات النشطة
              {activeTimers.length > 0 && (
                <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs px-2 py-0.5 rounded-full">
                  {activeTimers.length}
                </span>
              )}
            </h2>

            {activeTimers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">لا توجد مؤقتات نشطة</p>
            ) : (
              <div className="space-y-3">
                {activeTimers.map(timer => (
                  <div key={timer.id || timer.taskId} className="border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 bg-indigo-50/50 dark:bg-indigo-900/10">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate cursor-pointer hover:text-indigo-600"
                          onClick={() => navigate(`/super-admin/dev-tasks/${timer.taskId}`)}
                        >
                          {timer.taskTitle || "بدون عنوان"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTime(elapsedSecondsByTask[timer.taskId || ""] || 0)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {timer.isPaused ? (
                          <button onClick={() => resumeTimer(timer.taskId!, timer.id!)} className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg hover:bg-green-200">
                            <PlayIcon className="h-4 w-4" />
                          </button>
                        ) : (
                          <button onClick={() => pauseTimer(timer.taskId!, timer.id!)} className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 rounded-lg hover:bg-yellow-200">
                            <PauseIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => stopTimer(timer.taskId!, timer.id!)} className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg hover:bg-red-200">
                          <StopIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Team Active Timers */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
              <UserGroupIcon className="h-5 w-5 text-blue-600" />
              مؤقتات الفريق
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full">
                {allActiveTimers.length}
              </span>
            </h2>

            {allActiveTimers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">لا توجد مؤقتات نشطة للفريق</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {allActiveTimers.map(timer => (
                  <div key={timer.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2 h-2 rounded-full ${timer.isPaused ? "bg-yellow-500" : "bg-green-500 animate-pulse"}`}></div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{timer.taskTitle}</p>
                        <p className="text-xs text-gray-500">{timer.memberName}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                      {formatElapsedTime(timer.startTime, timer.isPaused)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Today's Summary */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
              <ChartBarIcon className="h-5 w-5 text-green-600" />
              ملخص اليوم
            </h2>

            {workingTime && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
                    <p className="text-green-100 text-xs">إجمالي الوقت</p>
                    <p className="text-2xl font-bold mt-1">{Math.floor(workingTime.totalHours)}س {workingTime.totalMinutes % 60}د</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                    <p className="text-blue-100 text-xs">الفترات المدمجة</p>
                    <p className="text-2xl font-bold mt-1">{workingTime.mergedIntervalCount}</p>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-2">الوقت لكل مهمة</p>
                  {!workingTime.perTask || workingTime.perTask.length === 0 ? (
                    <p className="text-xs text-gray-400">لا يوجد وقت مسجل</p>
                  ) : (
                    <div className="space-y-2">
                      {workingTime.perTask.slice(0, 5).map(pt => (
                        <div key={pt.taskId} className="flex items-center justify-between">
                          <button
                            onClick={() => navigate(`/super-admin/dev-tasks/${pt.taskId}`)}
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline truncate max-w-[150px]"
                          >
                            {pt.taskId.slice(0, 8)}...
                          </button>
                          <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                            {pt.totalMinutes} د
                          </span>
                        </div>
                      ))}
                      {workingTime.perTask.length > 5 && (
                        <p className="text-xs text-gray-400">+{workingTime.perTask.length - 5} مهمة أخرى</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
              <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
              إحصائيات سريعة
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">مؤقتاتي النشطة</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{activeTimers.length}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">مؤقتات الفريق</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{allActiveTimers.length}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">المجموعات</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">{groups.length}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">مجموعات تعمل الآن</span>
                <span className="font-bold text-green-600 dark:text-green-400">{groups.filter(g => g.isRunning).length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevTimerDashboard;