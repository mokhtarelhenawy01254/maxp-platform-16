import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Calendar,
  CheckCircle2,
  XCircle,
  Calculator,
  User,
  Clock,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  CheckSquare,
  RotateCcw,
} from 'lucide-react';
import api from '../../services/api';
import { tToast } from '../../utils/i18n-toast';
import SettlementDetailsModal from './SettlementDetailsModal';
import i18n from '../../i18n';

interface Resignation {
  id: string;
  resignationDate: string;
  lastWorkingDay: string;
  reason?: string;
  status: string;
  employee: {
    firstName: string;
    lastName: string;
    employeeNumber: string;
    position?: { title: string };
    department?: { name: string };
  };
}

const Resignations: React.FC = () => {
  const navigate = useNavigate();
  const [resignations, setResignations] = useState<Resignation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResignationId, setSelectedResignationId] = useState<string | null>(null);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);

  useEffect(() => {
    fetchResignations();
  }, []);

  const fetchResignations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/hr/resignations');
      setResignations(response.data.resignations || []);
    } catch (error) {
      console.error('Error fetching resignations:', error);
      tToast.error('Resignations.failed_fetch_eabb');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSettlement = (id: string) => {
    setSelectedResignationId(id);
    setIsSettlementModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock size={11} />
            معلق
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={11} />
            موافق عليه
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle size={11} />
            مرفوض
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <CheckCircle2 size={11} />
            مكتمل التصفية
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground border border-border/60">
            {status}
          </span>
        );
    }
  };

  const pendingCount = resignations.filter((r) => r.status === 'PENDING').length;
  const approvedCount = resignations.filter((r) => r.status === 'APPROVED').length;
  const completedCount = resignations.filter((r) => r.status === 'COMPLETED').length;

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center text-foreground">
        <div className="text-center">
          <RotateCcw className="animate-spin size-8 text-primary mx-auto mb-3" />
          <p className="text-xs font-mono text-muted-foreground">LOADING RESIGNATION DOSSIERS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-background text-foreground" dir={i18n.dir()}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Top Command Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">إدارة طلبات الاستقالة وإنهاء الخدمة</h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  OFFBOARDING
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                متابعة طلبات الاستقالة، الموافقات الإدارية، إخلاء الطرف، وحساب التسوية المالية النهائية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchResignations}
              className="h-9 px-3 rounded-lg border border-border/70 hover:bg-muted/30 text-xs font-medium text-foreground transition-colors"
              title="تحديث البيانات"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={() => navigate('/hr/resignations/new')}
              className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold flex items-center gap-2 transition-all shadow-xs"
            >
              <Plus size={14} />
              <span>تسجيل استقالة جديدة</span>
            </button>
          </div>
        </div>

        {/* Telemetry Stats Ribbon */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-card border border-border/70 rounded-xl p-3 shadow-xs">
          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={13} className="text-primary" />
              <span>إجمالي الطلبات</span>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
              {resignations.length}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">سجلات الاستقالة المسجلة</div>
          </div>

          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={13} className="text-amber-500" />
              <span>طلبات معلقة</span>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
              {pendingCount}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">تنتظر مراجعة الإدارة</div>
          </div>

          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-500" />
              <span>تمت الموافقة</span>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
              {approvedCount}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">بانتظار إخلاء الطرف والتسوية</div>
          </div>

          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Calculator size={13} className="text-sky-500" />
              <span>مكتمل التصفية</span>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-sky-600 dark:text-sky-400 mt-1">
              {completedCount}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">تم صرف المستحقات والإنهاء</div>
          </div>
        </div>

        {/* Resignations List */}
        {resignations.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-border/70 rounded-xl bg-card/40">
            <FileText size={36} className="mx-auto text-muted-foreground/60 mb-3" />
            <h3 className="text-sm font-semibold text-foreground">لا توجد طلبات استقالة مسجلة</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              يمكنك تسجيل طلب استقالة رسمي لموظف بالضغط على زر "تسجيل استقالة جديدة" أعلاه.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {resignations.map((resignation) => (
              <div
                key={resignation.id}
                className="bg-card border border-border/70 rounded-xl p-5 shadow-xs space-y-4 hover:border-border transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {resignation.employee?.firstName ? resignation.employee.firstName[0] : <User size={16} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-foreground">
                          {resignation.employee?.firstName} {resignation.employee?.lastName}
                        </h3>
                        {resignation.employee?.employeeNumber && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            #{resignation.employee.employeeNumber}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {resignation.employee?.position?.title && (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-muted/30 border border-border/50 text-muted-foreground">
                            {resignation.employee.position.title}
                          </span>
                        )}
                        {resignation.employee?.department?.name && (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-muted/30 border border-border/50 text-muted-foreground">
                            {resignation.employee.department.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(resignation.status)}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground p-2.5 rounded-lg bg-muted/15 border border-border/40">
                    <Calendar size={14} className="text-primary shrink-0" />
                    <span>تاريخ تقديم الاستقالة:</span>
                    <span className="font-mono tabular-nums font-semibold text-foreground">
                      {new Date(resignation.resignationDate).toLocaleDateString('ar-EG')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground p-2.5 rounded-lg bg-muted/15 border border-border/40">
                    <Clock size={14} className="text-amber-500 shrink-0" />
                    <span>آخر يوم عمل رسمي:</span>
                    <span className="font-mono tabular-nums font-semibold text-foreground">
                      {new Date(resignation.lastWorkingDay).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                </div>

                {resignation.reason && (
                  <div className="p-3 rounded-lg bg-muted/10 border border-border/40 text-xs">
                    <span className="font-semibold text-foreground ml-1">سبب الاستقالة:</span>
                    <span className="text-muted-foreground">{resignation.reason}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                  {resignation.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => navigate(`/hr/resignations/${resignation.id}/approve`)}
                        className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <CheckCircle2 size={13} />
                        <span>موافقة على الاستقالة</span>
                      </button>
                      <button
                        onClick={() => navigate(`/hr/resignations/${resignation.id}/reject`)}
                        className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <XCircle size={13} />
                        <span>رفض الطلب</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => navigate(`/hr/resignations/${resignation.id}/clearance`)}
                    className="h-8 px-3 rounded-lg border border-border/70 hover:bg-muted/30 text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors"
                  >
                    <CheckSquare size={13} />
                    <span>قائمة إخلاء الطرف</span>
                  </button>

                  {resignation.status === 'APPROVED' && (
                    <button
                      onClick={() => handleOpenSettlement(resignation.id)}
                      className="h-8 px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Calculator size={13} />
                      <span>حساب التصفية النهائية</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedResignationId && (
          <SettlementDetailsModal
            isOpen={isSettlementModalOpen}
            onClose={() => setIsSettlementModalOpen(false)}
            resignationId={selectedResignationId}
            onSuccess={fetchResignations}
          />
        )}

      </div>
    </div>
  );
};

export default Resignations;
