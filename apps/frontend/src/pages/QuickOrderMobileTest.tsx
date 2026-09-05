import React, { useState } from 'react';
import QuickOrderModal from '../components/facebook-inbox/Modals/QuickOrderModal';

const sampleProducts = [
  {
    id: 'prod-1',
    name: 'قميص كاجوال كلاسيك مميز جداً متوفر بجميع المقاسات والألوان',
    price: 350,
    images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300'],
    category: 'ملابس رجالي',
    stock: 25,
    status: 'AVAILABLE'
  },
  {
    id: 'prod-2',
    name: 'بنطلون جينز أزرق داكن خامة ممتازة',
    price: 450,
    images: ['https://images.unsplash.com/photo-1542272604-780c96856592?w=300'],
    category: 'ملابس رجالي',
    stock: 12,
    status: 'AVAILABLE'
  },
  {
    id: 'prod-3',
    name: 'حذاء رياضي مريح للجري والتمارين',
    price: 590,
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300'],
    category: 'أحذية',
    stock: 8,
    status: 'AVAILABLE'
  },
  {
    id: 'prod-4',
    name: 'ساعة يد أنيقة ضد الماء',
    price: 890,
    images: ['https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=300'],
    category: 'إكسسوارات',
    stock: 15,
    status: 'AVAILABLE'
  }
];

export default function QuickOrderMobileTest() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 flex flex-col items-center justify-center">
      <button 
        onClick={() => setIsOpen(true)}
        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 font-bold rounded-xl text-white shadow-lg transition-all"
      >
        فتح نافذة الطلب السريع (طلب سريع)
      </button>

      <QuickOrderModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        customerName="أحمد محمود"
        customerPhone="01012345678"
        platform="whatsapp"
        pageName="واتساب مبيعات"
      />
    </div>
  );
}
