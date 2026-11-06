import React from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard, Landmark, Wallet, Zap, CheckCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { PaymentMethod } from './types';

interface PayrollPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  paying: boolean;
  onConfirmPayment: () => void;
}

export const PayrollPaymentModal: React.FC<PayrollPaymentModalProps> = ({
  open,
  onOpenChange,
  paymentMethod,
  setPaymentMethod,
  paying,
  onConfirmPayment,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden p-0 rounded-3xl border-none shadow-2xl">
        <div className="relative bg-white dark:bg-slate-900">
          {/* Header */}
          <div className="p-6 pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400">
                <CreditCard className="h-6 w-6" />
              </div>
              <DialogTitle className="text-xl font-bold dark:text-white">بيانات الدفع</DialogTitle>
            </div>
          </div>

          <div className="p-6 pt-4 space-y-6">
            {/* Payment Methods Tabs */}
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {[
                { id: 'bank_transfer', label: 'تحويل بنكي', icon: Landmark },
                { id: 'cash', label: 'نقدي / كاش', icon: Wallet },
                { id: 'e_wallet', label: 'محفظة', icon: Zap }
              ].map(method => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${paymentMethod === method.id
                    ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                    }`}
                >
                  <method.icon className="h-4 w-4" />
                  {method.label}
                </button>
              ))}
            </div>

            {/* Payment Method Details */}
            {paymentMethod === 'bank_transfer' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="border border-slate-200 hover:border-blue-200 transition-colors dark:border-slate-800 flex justify-between items-center rounded-2xl p-5 bg-white dark:bg-slate-900 shadow-sm">
                  <div className="space-y-1 text-right">
                    <p className="text-slate-400 text-xs font-semibold mb-2">المسار البنكي</p>
                    <p className="text-slate-900 dark:text-white font-bold text-lg">البنك الوطني</p>
                    <p className="text-slate-500 text-sm">حساب نشط - جاري</p>
                  </div>
                  <div className="h-16 w-16 rounded-2xl bg-blue-100 dark:bg-blue-500/20 flex justify-center items-center shadow-sm">
                    <span className="text-blue-600 dark:text-blue-400 font-bold tracking-tight text-4xl italic">B</span>
                  </div>
                </div>

                <div className="border border-slate-200 hover:border-blue-200 transition-colors dark:border-slate-800 rounded-2xl p-5 bg-white dark:bg-slate-900 shadow-sm text-right">
                  <p className="text-slate-400 text-xs font-semibold mb-3">رقم الحساب الدولي</p>
                  <p className="text-slate-900 dark:text-white font-bold tracking-widest text-lg md:text-xl text-center font-mono tabular-nums" dir="ltr">
                    ...0003 4827 1019 3828
                  </p>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-emerald-500 font-bold text-sm tabular-nums">0.0%</span>
                    <span className="text-sm font-bold text-slate-400">تنمية التحفيز الشهري</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full w-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[0%]"></div>
                  </div>
                </div>
              </motion.div>
            )}

            {paymentMethod === 'cash' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-slate-200 dark:border-slate-800 rounded-2xl p-8 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col items-center justify-center text-center space-y-4"
              >
                <div className="h-20 w-20 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 rounded-full flex items-center justify-center">
                  <Wallet className="h-10 w-10" />
                </div>
                <div>
                  <p className="font-bold text-xl dark:text-white">الدفع النقدي مباشرة</p>
                  <p className="text-slate-500 mt-2">سيتم تسليم الراتب يداً بيد للموظف أو تحويله للخزنة الرئيسية.</p>
                </div>
              </motion.div>
            )}

            {paymentMethod === 'e_wallet' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-slate-200 dark:border-slate-800 rounded-2xl p-8 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col items-center justify-center text-center space-y-4"
              >
                <div className="h-16 w-16 bg-primary/10 border border-primary/20 text-primary rounded-full flex items-center justify-center">
                  <Zap className="h-8 w-8" />
                </div>
                <div>
                  <p className="font-bold text-xl dark:text-white">تحويل المحفظة الإلكترونية</p>
                  <p className="text-slate-500 mt-2">يتم التحويل الفوري لرقم المحفظة المسجل بملف الموظف بالشركة.</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-row-reverse justify-start gap-4">
            <Button
              onClick={onConfirmPayment}
              disabled={paying}
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px] shadow-md shadow-blue-500/20"
            >
              {paying ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-2"></div>
                  جاري التنفيذ...
                </>
              ) : (
                <>
                  <CheckCircle className="ml-2 h-5 w-5" />
                  تأكيد الصرف
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="text-slate-500 hover:text-slate-700 dark:text-slate-400">
              إلغاء التغييرات
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
