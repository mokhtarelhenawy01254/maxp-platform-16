import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { NewAppointmentPayload, TimeSlot } from "./types";
import { DateInput } from '../../../components/ui/DateInput';

interface CreateAppointmentModalProps {
  isOpen: boolean;
  newAppointment: NewAppointmentPayload;
  availableSlots: TimeSlot[];
  onAppointmentChange: (appointment: NewAppointmentPayload) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export const CreateAppointmentModal: React.FC<CreateAppointmentModalProps> = ({
  isOpen,
  newAppointment,
  availableSlots,
  onAppointmentChange,
  onSubmit,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-black dark:bg-opacity-70 transition-opacity"
          onClick={onClose}
        />
        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border border-gray-200 dark:border-gray-700">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                موعد جديد
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  اسم العميل *
                </label>
                <input
                  type="text"
                  value={newAppointment.customerName}
                  onChange={(e) =>
                    onAppointmentChange({
                      ...newAppointment,
                      customerName: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  placeholder="اسم العميل"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    value={newAppointment.customerEmail}
                    onChange={(e) =>
                      onAppointmentChange({
                        ...newAppointment,
                        customerEmail: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    رقم الهاتف
                  </label>
                  <input
                    type="tel"
                    value={newAppointment.customerPhone}
                    onChange={(e) =>
                      onAppointmentChange({
                        ...newAppointment,
                        customerPhone: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                    placeholder="01234567890"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  العنوان *
                </label>
                <input
                  type="text"
                  value={newAppointment.title}
                  onChange={(e) =>
                    onAppointmentChange({
                      ...newAppointment,
                      title: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  placeholder="عنوان الموعد"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الوصف
                </label>
                <textarea
                  value={newAppointment.description}
                  onChange={(e) =>
                    onAppointmentChange({
                      ...newAppointment,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 resize-none"
                  placeholder="وصف الموعد"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    التاريخ *
                  </label>
                  <DateInput
                    value={newAppointment.appointmentDate}
                    onChange={(e) =>
                      onAppointmentChange({
                        ...newAppointment,
                        appointmentDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الوقت *
                  </label>
                  {availableSlots.length > 0 ? (
                    <select
                      value={newAppointment.startTime}
                      onChange={(e) =>
                        onAppointmentChange({
                          ...newAppointment,
                          startTime: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                      style={{ colorScheme: "dark" }}
                      required
                    >
                      <option value="">اختر الوقت</option>
                      {availableSlots.map((slot, index) => (
                        <option
                          key={index}
                          value={slot.startTime}
                          disabled={!slot.available}
                          className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          {slot.startTime}{" "}
                          {slot.endTime ? `- ${slot.endTime}` : ""} (
                          {slot.duration} دقيقة)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="time"
                      value={newAppointment.startTime}
                      onChange={(e) =>
                        onAppointmentChange({
                          ...newAppointment,
                          startTime: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                      required
                    />
                  )}
                  {newAppointment.appointmentDate &&
                    availableSlots.length === 0 && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        أدخل الوقت يدوياً أو انتظر تحميل الأوقات المتاحة
                      </p>
                    )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الموظف *
                  </label>
                  <input
                    type="text"
                    value={newAppointment.staffId}
                    onChange={(e) =>
                      onAppointmentChange({
                        ...newAppointment,
                        staffId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                    placeholder="معرف الموظف (مثال: user-id)"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    اسم الموظف
                  </label>
                  <input
                    type="text"
                    value={newAppointment.staffName}
                    onChange={(e) =>
                      onAppointmentChange({
                        ...newAppointment,
                        staffName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                    placeholder="اسم الموظف"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    النوع
                  </label>
                  <select
                    value={newAppointment.type}
                    onChange={(e) =>
                      onAppointmentChange({
                        ...newAppointment,
                        type: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                    style={{ colorScheme: "dark" }}
                  >
                    <option
                      value="consultation"
                      className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      استشارة
                    </option>
                    <option
                      value="training"
                      className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      تدريب
                    </option>
                    <option
                      value="meeting"
                      className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      اجتماع
                    </option>
                    <option
                      value="demo"
                      className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      عرض توضيحي
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    المكان
                  </label>
                  <input
                    type="text"
                    value={newAppointment.location}
                    onChange={(e) =>
                      onAppointmentChange({
                        ...newAppointment,
                        location: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                    placeholder="المكان"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  رابط الاجتماع (اختياري)
                </label>
                <input
                  type="url"
                  value={newAppointment.meetingLink}
                  onChange={(e) =>
                    onAppointmentChange({
                      ...newAppointment,
                      meetingLink: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ملاحظات (اختياري)
                </label>
                <textarea
                  value={newAppointment.notes}
                  onChange={(e) =>
                    onAppointmentChange({
                      ...newAppointment,
                      notes: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 resize-none"
                  placeholder="ملاحظات إضافية"
                />
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
            <button
              onClick={onSubmit}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-base font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
            >
              حجز الموعد
            </button>
            <button
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
