import React, { useState } from 'react';
import {
  Users,
  Play,
  PauseCircle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { TeamMemberTaskSummary } from './TaskReportTypes';

interface TaskReportTeamMatrixProps {
  members: TeamMemberTaskSummary[];
  selectedUserId: string;
  onSelectMember: (userId: string, status?: string) => void;
}

export const TaskReportTeamMatrix: React.FC<TaskReportTeamMatrixProps> = ({
  members,
  selectedUserId,
  onSelectMember,
}) => {
  const [search, setSearch] = useState('');

  const filteredMembers = members.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.userName.toLowerCase().includes(q) ||
      (m.departmentName || '').toLowerCase().includes(q) ||
      (m.jobTitle || '').toLowerCase().includes(q)
    );
  });

  const totals = members.reduce(
    (acc, m) => {
      acc.inProgress += m.inProgressCount;
      acc.inReview += m.inReviewCount;
      acc.completedToday += m.completedTodayCount;
      acc.pending += m.pendingCount;
      acc.minutes += m.totalTrackedMinutes;
      return acc;
    },
    { inProgress: 0, inReview: 0, completedToday: 0, pending: 0, minutes: 0 }
  );

  const formatMinToH = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m > 0 ? `${m}m` : ''}`;
  };

  return (
    <div style={styles.container}>
      {/* Header Strip */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.titleWrap}>
            <Users size={14} color="#38bdf8" />
            <span style={styles.title}>مصفوفة توزيع مهام الفريق والإنتاجية اليومية</span>
            <span style={styles.countBadge}>{members.length} عضو</span>
          </div>
          <span style={styles.subtitle}>
            تتبع مباشر للمهام الجارية، العالقة في الاعتماد، والمنجزة اليوم لكل شخص
          </span>
        </div>

        <div style={styles.searchWrap}>
          <Search size={11} color="#64748b" style={styles.searchIcon} />
          <input
            type="text"
            placeholder="بحث بالاسم أو القسم…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </div>

      {/* Matrix Table */}
      <div style={styles.tableScroll}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th style={{ ...styles.th, width: '28%' }}>الموظف</th>
              <th style={{ ...styles.th, width: '13%', textAlign: 'center' }}>قيد التنفيذ ⏳</th>
              <th style={{ ...styles.th, width: '13%', textAlign: 'center' }}>انتظار الاعتماد 🔍</th>
              <th style={{ ...styles.th, width: '13%', textAlign: 'center' }}>أُنجزت اليوم ✅</th>
              <th style={{ ...styles.th, width: '11%', textAlign: 'center' }}>معلقة 📌</th>
              <th style={{ ...styles.th, width: '11%', textAlign: 'left' }}>وقت التايمر</th>
              <th style={{ ...styles.th, width: '11%', textAlign: 'center' }}>تصفية</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={7} style={styles.emptyTd}>
                  لا يوجد موظفون يطابقون شروط البحث
                </td>
              </tr>
            ) : (
              filteredMembers.map((m) => {
                const isSelected = selectedUserId === m.userId;
                const initials = m.userName.slice(0, 2).toUpperCase();

                return (
                  <tr
                    key={m.userId}
                    style={{
                      ...styles.tr,
                      background: isSelected ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
                    }}
                  >
                    {/* Member Info */}
                    <td style={styles.td}>
                      <div style={styles.memberCell}>
                        <div style={styles.avatar}>{initials}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={styles.memberName} title={m.userName}>
                            {m.userName}
                          </div>
                          <div style={styles.memberDept}>
                            {m.departmentName || m.jobTitle || 'فريق العمل'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* In Progress */}
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <span
                        style={{
                          ...styles.metricChip,
                          background: m.inProgressCount > 0 ? 'rgba(56, 189, 248, 0.14)' : 'rgba(255, 255, 255, 0.03)',
                          color: m.inProgressCount > 0 ? '#38bdf8' : '#64748b',
                          borderColor: m.inProgressCount > 0 ? 'rgba(56, 189, 248, 0.3)' : 'transparent',
                        }}
                        onClick={() => onSelectMember(m.userId, 'IN_PROGRESS')}
                        title="عرض المهام قيد التنفيذ لهذا الموظف"
                      >
                        {m.inProgressCount}
                      </span>
                    </td>

                    {/* In Review */}
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <span
                        style={{
                          ...styles.metricChip,
                          background: m.inReviewCount > 0 ? 'rgba(234, 179, 8, 0.14)' : 'rgba(255, 255, 255, 0.03)',
                          color: m.inReviewCount > 0 ? '#eab308' : '#64748b',
                          borderColor: m.inReviewCount > 0 ? 'rgba(234, 179, 8, 0.3)' : 'transparent',
                        }}
                        onClick={() => onSelectMember(m.userId, 'IN_REVIEW')}
                        title="عرض المهام المعلقة في انتظار الاعتماد لهذا الموظف"
                      >
                        {m.inReviewCount}
                      </span>
                    </td>

                    {/* Completed Today */}
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <span
                        style={{
                          ...styles.metricChip,
                          background: m.completedTodayCount > 0 ? 'rgba(34, 197, 94, 0.14)' : 'rgba(255, 255, 255, 0.03)',
                          color: m.completedTodayCount > 0 ? '#22c55e' : '#64748b',
                          borderColor: m.completedTodayCount > 0 ? 'rgba(34, 197, 94, 0.3)' : 'transparent',
                        }}
                        onClick={() => onSelectMember(m.userId, 'COMPLETED')}
                        title="عرض المهام المنجزة اليوم لهذا الموظف"
                      >
                        {m.completedTodayCount}
                      </span>
                    </td>

                    {/* Pending */}
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <span style={{ ...styles.metricChip, color: '#94a3b8' }}>
                        {m.pendingCount}
                      </span>
                    </td>

                    {/* Tracked Stopwatch Minutes */}
                    <td style={{ ...styles.td, textAlign: 'left' }}>
                      <span style={styles.timeNum}>
                        {formatMinToH(m.totalTrackedMinutes)}
                      </span>
                    </td>

                    {/* Action Filter Button */}
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <button
                        onClick={() => onSelectMember(isSelected ? 'all' : m.userId)}
                        style={{
                          ...styles.filterBtn,
                          background: isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.06)',
                          color: isSelected ? '#09090b' : '#cbd5e1',
                        }}
                        title={isSelected ? 'إلغاء التصفية' : 'تصفية الجدول لمهام هذا الموظف فقط'}
                      >
                        {isSelected ? 'محدد' : 'عرض'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Totals Summary Footer Row */}
          <tfoot>
            <tr style={styles.tfRow}>
              <td style={styles.td}>
                <span style={styles.totalLabel}>إجمالي الفريق ({members.length})</span>
              </td>
              <td style={{ ...styles.td, textAlign: 'center' }}>
                <span style={{ ...styles.totalValue, color: '#38bdf8' }}>{totals.inProgress}</span>
              </td>
              <td style={{ ...styles.td, textAlign: 'center' }}>
                <span style={{ ...styles.totalValue, color: '#eab308' }}>{totals.inReview}</span>
              </td>
              <td style={{ ...styles.td, textAlign: 'center' }}>
                <span style={{ ...styles.totalValue, color: '#22c55e' }}>{totals.completedToday}</span>
              </td>
              <td style={{ ...styles.td, textAlign: 'center' }}>
                <span style={{ ...styles.totalValue, color: '#94a3b8' }}>{totals.pending}</span>
              </td>
              <td style={{ ...styles.td, textAlign: 'left' }}>
                <span style={{ ...styles.totalValue, color: '#f8fafc' }}>
                  {formatMinToH(totals.minutes)}
                </span>
              </td>
              <td style={styles.td} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#121214',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    flexWrap: 'wrap',
    gap: 8,
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  titleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: 700,
    color: '#f8fafc',
  },
  countBadge: {
    fontSize: 10,
    fontWeight: 600,
    padding: '1px 6px',
    borderRadius: 10,
    background: 'rgba(56, 189, 248, 0.12)',
    color: '#38bdf8',
  },
  subtitle: {
    fontSize: 10.5,
    color: '#94a3b8',
  },
  searchWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    right: 7,
    pointerEvents: 'none',
  },
  searchInput: {
    background: '#18181b',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    color: '#f8fafc',
    fontSize: 11,
    padding: '3px 24px 3px 6px',
    fontFamily: 'inherit',
    outline: 'none',
    width: 150,
  },
  tableScroll: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 11.5,
  },
  thRow: {
    background: 'rgba(24, 24, 27, 0.5)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
  th: {
    padding: '7px 10px',
    textAlign: 'right',
    color: '#94a3b8',
    fontWeight: 600,
    fontSize: 11,
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    transition: 'background 120ms ease',
  },
  td: {
    padding: '6px 10px',
    verticalAlign: 'middle',
  },
  emptyTd: {
    padding: 18,
    textAlign: 'center',
    color: '#64748b',
    fontSize: 11.5,
  },
  memberCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 4,
    background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  memberName: {
    fontSize: 11.5,
    fontWeight: 600,
    color: '#f1f5f9',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 160,
  },
  memberDept: {
    fontSize: 9.5,
    color: '#64748b',
  },
  metricChip: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 4,
    border: '1px solid transparent',
    fontSize: 11,
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    cursor: 'pointer',
    transition: 'all 120ms ease',
  },
  timeNum: {
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 600,
    color: '#94a3b8',
    fontSize: 11,
  },
  filterBtn: {
    border: 'none',
    borderRadius: 4,
    padding: '2px 8px',
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 120ms ease',
  },
  tfRow: {
    background: 'rgba(24, 24, 27, 0.7)',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#f8fafc',
  },
  totalValue: {
    fontSize: 12,
    fontWeight: 800,
    fontVariantNumeric: 'tabular-nums',
  },
};
