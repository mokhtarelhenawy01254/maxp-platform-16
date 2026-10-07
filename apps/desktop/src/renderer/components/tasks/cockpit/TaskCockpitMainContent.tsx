import React, { useState } from 'react';
import {
  RotateCcw,
  Shield,
  Paperclip,
  ImageIcon,
  MessageSquare,
  History,
  Copy,
  CheckCheck,
} from 'lucide-react';
import { TaskDescriptionRenderer } from '../TaskDescriptionRenderer';
import { AcceptanceCriteriaChecklist } from '../AcceptanceCriteriaChecklist';
import { TaskSubtasks } from '../TaskSubtasks';
import { TaskComments } from '../TaskComments';
import { TaskActivityLog } from '../TaskActivityLog';
import { cockpitMainStyles as styles } from './cockpitStyles';

interface TaskCockpitMainContentProps {
  task: any;
  currentUserId?: string;
  isAdmin?: boolean;
  canEditTask?: boolean;
  serverUrl?: string;
  onOpenImage?: (imgUrl: string) => void;
}

export const TaskCockpitMainContent: React.FC<TaskCockpitMainContentProps> = ({
  task,
  currentUserId = '',
  isAdmin = false,
  canEditTask = false,
  serverUrl = 'https://maxp.online',
  onOpenImage,
}) => {
  const [activeBottomTab, setActiveBottomTab] = useState<'comments' | 'activity'>('comments');
  const [copiedTitle, setCopiedTitle] = useState(false);

  const rawStatus = String(task.status || '').toUpperCase();
  const isReturnedForRevision =
    rawStatus === 'REVISION' ||
    (Array.isArray(task.tags) && task.tags.includes('needs_revision'));

  const attachments = task.taskAttachments || task.attachments || [];

  const handleCopyTitle = async () => {
    try {
      if (window.electronAPI?.copyToClipboard) {
        await window.electronAPI.copyToClipboard(task.title || '');
      } else {
        await navigator.clipboard.writeText(task.title || '');
      }
      setCopiedTitle(true);
      setTimeout(() => setCopiedTitle(false), 2000);
    } catch {}
  };

  const resolveAttachmentUrl = (rawPath: string) => {
    if (!rawPath) return '';
    if (rawPath.startsWith('data:') || rawPath.startsWith('blob:') || rawPath.startsWith('http')) {
      return rawPath;
    }
    let base = (serverUrl || 'https://maxp.online').trim().replace(/\/$/, '');
    let normalized = rawPath.replace(/\\/g, '/');
    if (!normalized.startsWith('/')) normalized = `/${normalized}`;
    if (!normalized.startsWith('/uploads/')) {
      normalized = `/uploads${normalized}`;
    }
    return `${base}${normalized}`;
  };

  const isImgAttachment = (att: any) => {
    if (att.fileType?.startsWith('image/')) return true;
    const name = att.originalName || att.fileName || att.filePath || '';
    return /\.(png|jpe?g|webp|gif|svg)$/i.test(name);
  };

  return (
    <main style={styles.main}>
      {/* 1. Revision Alert Banner (If task returned) */}
      {isReturnedForRevision && (
        <div style={styles.revisionBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RotateCcw size={14} color="var(--accent-yellow)" />
            <span style={{ fontWeight: 700, color: 'var(--accent-yellow)', fontSize: 12 }}>
              تمت إعادة المهمة من المشرف لإجراء تعديلات
              {task.returnCount > 0 ? ` (أعيدت ${task.returnCount} مرات)` : ''}
            </span>
          </div>
          {task.revisionReason && (
            <div style={styles.revisionReasonText}>
              <strong>ملاحظات المراجعة:</strong> {task.revisionReason}
            </div>
          )}
        </div>
      )}

      {/* 2. Task Title Header */}
      <div style={styles.titleSection}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <h1 dir="auto" style={styles.title}>
            {task.title}
          </h1>
          <button
            type="button"
            onClick={handleCopyTitle}
            style={styles.copyTitleBtn}
            title={copiedTitle ? 'تم النسخ!' : 'نسخ العنوان'}
          >
            {copiedTitle ? <CheckCheck size={13} color="var(--accent-green)" /> : <Copy size={13} />}
          </button>
        </div>
      </div>

      {/* 3. Delivery Evidence Dossier (if present) */}
      {(task.hasEvidence || task.evidence || task.missingEvidence) && (
        <div style={styles.evidenceCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield size={14} color="var(--accent-blue)" />
            <span style={styles.sectionHeader}>ملف دليل التسليم والإنجاز (Delivery Evidence)</span>
          </div>
          {task.missingEvidence || !task.evidence ? (
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              لم يتم إرفاق ملف دليل تشغيل رقمي مسجل.
            </p>
          ) : (
            <div style={styles.evidenceGrid}>
              {task.evidence?.changeType && (
                <div style={styles.evidenceCell}>
                  <span style={styles.evidenceCellLabel}>نوع التغيير</span>
                  <span style={{ fontWeight: 600 }}>{task.evidence.changeType}</span>
                </div>
              )}
              {task.evidence?.commitOrPath && (
                <div style={styles.evidenceCell}>
                  <span style={styles.evidenceCellLabel}>المسار / Commit</span>
                  <code style={{ fontSize: 10 }}>{task.evidence.commitOrPath}</code>
                </div>
              )}
              {task.evidence?.numbersBeforeAfter && (
                <div style={styles.evidenceCell}>
                  <span style={styles.evidenceCellLabel}>الأرقام قبل / بعد</span>
                  <span>{task.evidence.numbersBeforeAfter}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. Task Description Renderer */}
      <div style={styles.sectionCard}>
        <TaskDescriptionRenderer description={task.description || ''} maxCollapsedHeight={200} />
      </div>

      {/* 5. Acceptance Criteria & Quality Gate (بوابة معايير القبول والتسليم) */}
      {task.acceptanceCriteria && (
        <div style={styles.criteriaCard}>
          <AcceptanceCriteriaChecklist
            value={task.acceptanceCriteria || ''}
            readOnly={true}
            interactive={true}
            taskId={task.id}
          />
        </div>
      )}

      {/* 6. AI Brief (سياق الذكاء الاصطناعي) */}
      {task.aiDescription && (
        <div style={styles.aiBriefCard}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)' }}>
              وصف وسياق الذكاء الاصطناعي (AI Brief)
            </span>
            <span style={styles.aiChip}>AI Prompt</span>
          </div>
          <div style={styles.aiContent}>{task.aiDescription}</div>
        </div>
      )}

      {/* 7. Subtasks */}
      <div style={styles.sectionCard}>
        <TaskSubtasks taskId={task.id} canEdit={canEditTask} />
      </div>

      {/* 8. Attachments Gallery */}
      {attachments.length > 0 && (
        <div style={styles.sectionCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Paperclip size={13} color="var(--accent-blue)" />
            <span style={styles.sectionHeader}>المرفقات والملفات ({attachments.length})</span>
          </div>

          <div style={styles.attachGrid}>
            {attachments.map((att: any, idx: number) => {
              const fullUrl = resolveAttachmentUrl(att.filePath || '');
              const isImg = isImgAttachment(att);
              const label = att.originalName || att.fileName || `مرفق ${idx + 1}`;

              return (
                <div
                  key={idx}
                  onClick={() => onOpenImage?.(fullUrl)}
                  style={styles.attItem}
                  title={`معاينة: ${label}`}
                >
                  {isImg ? (
                    <img
                      src={fullUrl}
                      alt={label}
                      style={styles.attThumb}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.opacity = '0.3';
                      }}
                    />
                  ) : (
                    <div style={styles.attFileIcon}>
                      <Paperclip size={15} color="var(--text-muted)" />
                    </div>
                  )}
                  <span style={styles.attLabel}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 9. Bottom Tabs: Comments vs Activity Log */}
      <div style={styles.sectionCard}>
        <div style={styles.tabBar}>
          <button
            type="button"
            onClick={() => setActiveBottomTab('comments')}
            style={{
              ...styles.tabBtn,
              color: activeBottomTab === 'comments' ? 'var(--accent-blue)' : 'var(--text-muted)',
              borderBottom: activeBottomTab === 'comments' ? '2px solid var(--accent-blue)' : '2px solid transparent',
            }}
          >
            <MessageSquare size={13} />
            <span>النقاش والتعليقات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveBottomTab('activity')}
            style={{
              ...styles.tabBtn,
              color: activeBottomTab === 'activity' ? 'var(--accent-blue)' : 'var(--text-muted)',
              borderBottom: activeBottomTab === 'activity' ? '2px solid var(--accent-blue)' : '2px solid transparent',
            }}
          >
            <History size={13} />
            <span>سجل النشاط والتعديلات</span>
          </button>
        </div>

        <div style={{ marginTop: 10 }}>
          {activeBottomTab === 'comments' ? (
            <TaskComments
              taskId={task.id}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              hideInputBar={false}
            />
          ) : (
            <TaskActivityLog taskId={task.id} isTaskReturned={isReturnedForRevision} />
          )}
        </div>
      </div>
    </main>
  );
};

