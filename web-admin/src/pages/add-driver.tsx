import React, { useRef, useState } from 'react';
import Layout from '../components/Layout';
import { apiService } from '../services/api';

interface StepProps {
  next?: () => void;
  prev?: () => void;
  onSubmit?: () => void;
  data: any;
  setData: (data: any) => void;
}

function StepUploadDocuments({ next, prev, data, setData }: StepProps) {
  const docs = [
    { key: 'vehicleDocument', label: 'Giấy tờ xe' },
    { key: 'insuranceDocument', label: 'Bảo hiểm xe' },
    { key: 'licenseDocument', label: 'Bằng lái xe' },
  ];
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const handleFileChange = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setData({ ...data, [docs[idx].key]: ev.target?.result });
      };
      reader.readAsDataURL(file);
    }
  };
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Giấy tờ xe</h2>
      <div className="space-y-4 mb-8">
        {docs.map((doc, idx) => (
          <div key={doc.key} className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{doc.label}</label>
            <div className="flex items-center gap-4">
              {data[doc.key] ? (
                <>
                  <img src={data[doc.key]} alt={doc.label} className="w-20 h-20 rounded object-cover border border-slate-300 dark:border-slate-600" />
                  <button type="button" onClick={() => fileInputRefs.current[idx]?.click()} className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Đổi</button>
                </>
              ) : (
                <button type="button" onClick={() => fileInputRefs.current[idx]?.click()} className="px-4 py-2 bg-[#FF6B00] text-white rounded text-sm hover:bg-[#e56200] transition-colors">Chọn ảnh</button>
              )}
            </div>
            <input type="file" accept="image/*" className="hidden" ref={el => fileInputRefs.current[idx] = el} onChange={e => handleFileChange(idx, e)} />
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={prev} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Quay lại</button>
        <button type="button" onClick={next} disabled={docs.some(doc => !data[doc.key])} className="flex-1 px-4 py-2 bg-[#FF6B00] text-white rounded-lg font-medium hover:bg-[#e56200] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Tiếp tục</button>
      </div>
    </div>
  );
}

function StepUploadCCCD({ next, prev, data, setData }: StepProps) {
  const docs = [
    { key: 'idCardFront', label: 'CCCD mặt trước' },
    { key: 'idCardBack', label: 'CCCD mặt sau' },
  ];
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const handleFileChange = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setData({ ...data, [docs[idx].key]: ev.target?.result });
      };
      reader.readAsDataURL(file);
    }
  };
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Chứng minh thư nhân dân</h2>
      <div className="space-y-4 mb-8">
        {docs.map((doc, idx) => (
          <div key={doc.key} className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{doc.label}</label>
            <div className="flex items-center gap-4">
              {data[doc.key] ? (
                <>
                  <img src={data[doc.key]} alt={doc.label} className="w-20 h-20 rounded object-cover border border-slate-300 dark:border-slate-600" />
                  <button type="button" onClick={() => fileInputRefs.current[idx]?.click()} className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Đổi</button>
                </>
              ) : (
                <button type="button" onClick={() => fileInputRefs.current[idx]?.click()} className="px-4 py-2 bg-[#FF6B00] text-white rounded text-sm hover:bg-[#e56200] transition-colors">Chọn ảnh</button>
              )}
            </div>
            <input type="file" accept="image/*" className="hidden" ref={el => fileInputRefs.current[idx] = el} onChange={e => handleFileChange(idx, e)} />
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={prev} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Quay lại</button>
        <button type="button" onClick={next} disabled={docs.some(doc => !data[doc.key])} className="flex-1 px-4 py-2 bg-[#FF6B00] text-white rounded-lg font-medium hover:bg-[#e56200] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Tiếp tục</button>
      </div>
    </div>
  );
}

function StepPersonal({ next, data, setData }: StepProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Thông tin cá nhân</h2>
      <div className="space-y-4 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tên</label>
            <input 
              type="text"
              value={data.firstName || ''} 
              onChange={e => setData({ ...data, firstName: e.target.value })} 
              placeholder="Nhập tên"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Họ</label>
            <input 
              type="text"
              value={data.lastName || ''} 
              onChange={e => setData({ ...data, lastName: e.target.value })} 
              placeholder="Nhập họ"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Số điện thoại</label>
          <input 
            type="tel"
            value={data.phone || ''} 
            onChange={e => setData({ ...data, phone: e.target.value })} 
            placeholder="Nhập số điện thoại"
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Email</label>
          <input 
            type="email"
            value={data.email || ''} 
            onChange={e => setData({ ...data, email: e.target.value })} 
            placeholder="Nhập email"
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Ngày sinh</label>
          <input 
            type="date"
            value={data.dateOfBirth || ''} 
            onChange={e => setData({ ...data, dateOfBirth: e.target.value })} 
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Địa chỉ</label>
          <input 
            type="text"
            value={data.address || ''} 
            onChange={e => setData({ ...data, address: e.target.value })} 
            placeholder="Nhập địa chỉ"
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
          />
        </div>
      </div>
      <button type="button" onClick={next} disabled={!data.firstName || !data.lastName || !data.phone || !data.email} className="w-full px-4 py-2 bg-[#FF6B00] text-white rounded-lg font-medium hover:bg-[#e56200] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Tiếp tục</button>
    </div>
  );
}

function StepVehicle({ next, prev, data, setData }: StepProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Thông tin phương tiện</h2>
      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Loại xe</label>
          <select 
            value={data.vehicleType || ''} 
            onChange={e => setData({ ...data, vehicleType: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
          >
            <option value="">Chọn loại xe</option>
            <option value="car">Ô tô</option>
            <option value="bike">Xe máy</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Biển số</label>
          <input 
            type="text"
            value={data.vehiclePlate || ''} 
            onChange={e => setData({ ...data, vehiclePlate: e.target.value })} 
            placeholder="Nhập biển số xe"
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent uppercase"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Model xe</label>
          <input 
            type="text"
            value={data.vehicleModel || ''} 
            onChange={e => setData({ ...data, vehicleModel: e.target.value })} 
            placeholder="Nhập model xe"
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={prev} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Quay lại</button>
        <button type="button" onClick={next} className="flex-1 px-4 py-2 bg-[#FF6B00] text-white rounded-lg font-medium hover:bg-[#e56200] transition-colors">Tiếp tục</button>
      </div>
    </div>
  );
}

function StepBank({ next, prev, data, setData }: StepProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Tài khoản ngân hàng</h2>
      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Chủ tài khoản</label>
          <input 
            type="text"
            value={data.bankAccountHolder || ''} 
            onChange={e => setData({ ...data, bankAccountHolder: e.target.value })} 
            placeholder="Nhập tên chủ tài khoản"
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Số tài khoản</label>
          <input 
            type="text"
            value={data.bankAccount || ''} 
            onChange={e => setData({ ...data, bankAccount: e.target.value })} 
            placeholder="Nhập số tài khoản"
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Ngân hàng</label>
          <input 
            type="text"
            value={data.bankName || ''} 
            onChange={e => setData({ ...data, bankName: e.target.value })} 
            placeholder="Nhập tên ngân hàng"
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={prev} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Quay lại</button>
        <button type="button" onClick={next} className="flex-1 px-4 py-2 bg-[#FF6B00] text-white rounded-lg font-medium hover:bg-[#e56200] transition-colors">Tiếp tục</button>
      </div>
    </div>
  );
}

function StepUploadPortrait({ next, prev, data, setData }: StepProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Ảnh đại diện</h2>
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 mb-8">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Tải ảnh đại diện</label>
        <div className="flex items-center gap-4">
          {data.driverPhoto ? (
            <>
              <img src={data.driverPhoto} alt="Portrait" className="w-24 h-24 rounded object-cover border border-slate-300 dark:border-slate-600" />
              <input 
                type="file" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => setData({ ...data, driverPhoto: e.target?.result as string });
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden" 
                id="portraitInput"
              />
              <label htmlFor="portraitInput" className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-sm font-medium cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                Đổi ảnh
              </label>
            </>
          ) : (
            <>
              <input 
                type="file" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => setData({ ...data, driverPhoto: e.target?.result as string });
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden" 
                id="portraitInput2"
              />
              <label htmlFor="portraitInput2" className="flex-1 px-4 py-2 bg-[#FF6B00] text-white rounded text-sm font-medium cursor-pointer hover:bg-[#e56200] transition-colors">
                Chọn ảnh
              </label>
            </>
          )}
        </div>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={prev} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Quay lại</button>
        <button type="button" onClick={next} disabled={!data.driverPhoto} className="flex-1 px-4 py-2 bg-[#FF6B00] text-white rounded-lg font-medium hover:bg-[#e56200] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Tiếp tục</button>
      </div>
    </div>
  );
}

function StepConfirm({ prev, onSubmit, data }: StepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Xác nhận thông tin</h2>
      
      <div className="space-y-4 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Thông tin cá nhân</h3>
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <p><span className="font-medium text-slate-900 dark:text-slate-300">Họ tên:</span> {data.firstName} {data.lastName}</p>
            <p><span className="font-medium text-slate-900 dark:text-slate-300">Ngày sinh:</span> {data.dateOfBirth || '—'}</p>
            <p><span className="font-medium text-slate-900 dark:text-slate-300">Địa chỉ:</span> {data.address || '—'}</p>
            <p><span className="font-medium text-slate-900 dark:text-slate-300">Điện thoại:</span> {data.phone || '—'}</p>
            <p><span className="font-medium text-slate-900 dark:text-slate-300">Email:</span> {data.email || '—'}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Thông tin phương tiện</h3>
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <p><span className="font-medium text-slate-900 dark:text-slate-300">Loại xe:</span> {data.vehicleType === 'car' ? 'Ô tô' : data.vehicleType === 'bike' ? 'Xe máy' : '—'}</p>
            <p><span className="font-medium text-slate-900 dark:text-slate-300">Biển số:</span> {data.vehiclePlate || '—'}</p>
            <p><span className="font-medium text-slate-900 dark:text-slate-300">Model:</span> {data.vehicleModel || '—'}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Tài khoản ngân hàng</h3>
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <p><span className="font-medium text-slate-900 dark:text-slate-300">Chủ tài khoản:</span> {data.bankAccountHolder || '—'}</p>
            <p><span className="font-medium text-slate-900 dark:text-slate-300">Số tài khoản:</span> {data.bankAccount || '—'}</p>
            <p><span className="font-medium text-slate-900 dark:text-slate-300">Ngân hàng:</span> {data.bankName || '—'}</p>
          </div>
        </div>

        {(data.driverPhoto || data.vehicleDocument || data.insuranceDocument || data.licenseDocument || data.idCardFront || data.idCardBack) && (
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Tài liệu</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {data.driverPhoto && <img src={data.driverPhoto} alt="Portrait" className="w-full h-24 object-cover rounded border border-slate-200 dark:border-slate-600" />}
              {data.idCardFront && <img src={data.idCardFront} alt="ID Front" className="w-full h-24 object-cover rounded border border-slate-200 dark:border-slate-600" />}
              {data.idCardBack && <img src={data.idCardBack} alt="ID Back" className="w-full h-24 object-cover rounded border border-slate-200 dark:border-slate-600" />}
              {data.vehicleDocument && <img src={data.vehicleDocument} alt="Vehicle Doc" className="w-full h-24 object-cover rounded border border-slate-200 dark:border-slate-600" />}
              {data.insuranceDocument && <img src={data.insuranceDocument} alt="Insurance" className="w-full h-24 object-cover rounded border border-slate-200 dark:border-slate-600" />}
              {data.licenseDocument && <img src={data.licenseDocument} alt="License" className="w-full h-24 object-cover rounded border border-slate-200 dark:border-slate-600" />}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={prev} disabled={isSubmitting} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Quay lại</button>
        <button type="button" onClick={handleConfirm} disabled={isSubmitting} className="flex-1 px-4 py-2 bg-[#FF6B00] text-white rounded-lg font-medium hover:bg-[#e56200] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
          {isSubmitting && <span className="animate-spin"><span className="material-symbols-outlined text-[16px]">autorenew</span></span>}
          {isSubmitting ? 'Đang gửi...' : 'Hoàn thành'}
        </button>
      </div>
    </div>
  );
}

export default function AddDriverPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      const driverData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth,
        address: data.address,
        
        // Vehicle info
        vehiclePlate: data.vehiclePlate,
        vehicleModel: data.vehicleModel,
        vehicleColor: data.vehicleColor,
        licenseNumber: data.licenseNumber,
        licenseExpiry: data.licenseExpiry,
        
        // Bank info
        bankAccountHolder: data.bankAccountHolder,
        bankAccount: data.bankAccount,
        bankName: data.bankName,
        
        // Documents
        vehicleImage: data.vehicleImage,
        licenseImage: data.licenseDocument,
        idImage: data.idCardFront,
        portraitImage: data.portraitImage,
        insuranceCertificate: data.insuranceDocument,
      };

      console.log('Submitting driver data:', driverData);
      await apiService.createDriver(driverData);
      
      alert('Đã gửi đơn đăng ký tài xế thành công!');
      setStep(1);
      setData({});
      
      // Redirect to driver management after 2 seconds
      setTimeout(() => {
        window.location.href = '/driver-management';
      }, 2000);
    } catch (err) {
      console.error('Error submitting driver:', err);
      alert('Lỗi khi đăng ký tài xế: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = [
    'Cá nhân',
    'Phương tiện',
    'Ngân hàng',
    'Ảnh chân dung',
    'Giấy tờ xe',
    'CCCD',
    'Xác nhận',
  ];

  return (
    <Layout>
      <div className="min-h-[calc(100vh-64px)] w-full bg-slate-50 dark:bg-slate-900 flex flex-col">
        <div className="max-w-4xl mx-auto w-full px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Đăng ký tài xế mới</h1>
            <p className="text-slate-600 dark:text-slate-400">Vui lòng điền đầy đủ thông tin để hoàn tất quá trình đăng ký</p>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between gap-2 mb-3">
              {stepLabels.map((label, idx) => (
                <div key={idx} className="flex-1 flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                    step === idx + 1 
                      ? 'bg-[#FF6B00] text-white' 
                      : step > idx + 1 
                      ? 'bg-green-500 text-white' 
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                    {step > idx + 1 ? '✓' : idx + 1}
                  </div>
                  {idx < stepLabels.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 transition-all ${
                      step > idx + 1 ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'
                    }`}></div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              {stepLabels.map((label, idx) => (
                <span key={idx} className={`text-xs font-medium ${
                  step === idx + 1 
                    ? 'text-[#FF6B00]' 
                    : 'text-slate-500 dark:text-slate-400'
                }`}>
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
            {step === 1 && <StepPersonal next={() => setStep(2)} data={data} setData={setData} />}
            {step === 2 && <StepVehicle next={() => setStep(3)} prev={() => setStep(1)} data={data} setData={setData} />}
            {step === 3 && <StepBank next={() => setStep(4)} prev={() => setStep(2)} data={data} setData={setData} />}
            {step === 4 && <StepUploadPortrait next={() => setStep(5)} prev={() => setStep(3)} data={data} setData={setData} />}
            {step === 5 && <StepUploadDocuments next={() => setStep(6)} prev={() => setStep(4)} data={data} setData={setData} />}
            {step === 6 && <StepUploadCCCD next={() => setStep(7)} prev={() => setStep(5)} data={data} setData={setData} />}
            {step === 7 && <StepConfirm prev={() => setStep(6)} onSubmit={handleSubmit} data={data} setData={setData} />}
          </div>
        </div>
      </div>
    </Layout>
  );
}
