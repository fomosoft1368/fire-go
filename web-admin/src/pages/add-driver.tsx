// Bước upload giấy tờ xe (giấy tờ xe, bảo hiểm, bằng lái)
import { useState, useRef } from 'react';
import Layout from '../components/Layout';

interface StepProps {
  next?: () => void;
  prev?: () => void;
  data: any;
  setData: (data: any) => void;
}

function StepUploadDocuments({ next, prev, data, setData }: StepProps) {
  const docs = [
    { key: 'vehicleDocument', label: 'Giấy tờ xe', icon: 'description' },
    { key: 'insuranceDocument', label: 'Bảo hiểm xe', icon: 'verified_user' },
    { key: 'licenseDocument', label: 'Bằng lái xe', icon: 'credit_card' },
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
      <h2 className="text-3xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-primary flex items-center gap-3 drop-shadow">
        <span className="material-symbols-outlined text-4xl bg-primary/20 text-primary rounded-full p-2 shadow-lg">folder_copy</span>
        Giấy tờ xe
      </h2>
      <div className="space-y-6 mb-10">
        {docs.map((doc, idx) => (
          <div key={doc.key} className="bg-slate-900/50 rounded-2xl p-8 border-2 border-slate-700 hover:border-primary transition-all duration-300 shadow-xl">
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="bg-primary/20 rounded-full p-4 shadow-lg">
                  <span className="material-symbols-outlined text-3xl text-primary">{doc.icon}</span>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-100 mb-2">{doc.label}</h3>
                  <p className="text-slate-400 text-base">{data[doc.key] ? 'Đã tải ✓' : 'Chưa tải ảnh'}</p>
                </div>
              </div>
              <div className="flex-shrink-0">
                {data[doc.key] ? (
                  <img src={data[doc.key]} alt={doc.label} className="w-28 h-28 rounded-xl object-cover border-4 border-primary shadow-lg" />
                ) : (
                  <div className="w-28 h-28 rounded-xl border-2 border-dashed border-primary/60 bg-slate-800 flex items-center justify-center text-primary/60 cursor-pointer hover:bg-primary/10 transition-all duration-200" onClick={() => fileInputRefs.current[idx]?.click()}>
                    <span className="material-symbols-outlined text-4xl">upload</span>
                  </div>
                )}
              </div>
            </div>
            <input type="file" accept="image/*" className="hidden" ref={el => fileInputRefs.current[idx] = el} onChange={e => handleFileChange(idx, e)} />
            <button className="w-full mt-4 bg-gradient-to-r from-primary via-orange-400 to-orange-500 text-white font-extrabold py-3 rounded-xl shadow-lg text-base tracking-wide hover:scale-105 active:scale-95 transition-all duration-200" onClick={() => fileInputRefs.current[idx]?.click()}>{data[doc.key] ? 'Đổi ảnh' : 'Tải ảnh'}</button>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-8">
        <button className="flex-1 bg-slate-900 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all border-2 border-slate-700" onClick={prev}>Quay lại</button>
        <button className="flex-1 bg-gradient-to-r from-primary via-orange-400 to-orange-500 text-white font-extrabold py-4 rounded-xl text-lg shadow-lg tracking-wide hover:scale-105 active:scale-95 transition-all duration-200" onClick={next} disabled={docs.some(doc => !data[doc.key])}>Tiếp tục</button>
      </div>
    </div>
  );
}

function StepUploadCCCD({ next, prev, data, setData }: StepProps) {
  const docs = [
    { key: 'idCardFront', label: 'CCCD mặt trước', icon: 'badge' },
    { key: 'idCardBack', label: 'CCCD mặt sau', icon: 'badge' },
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
      <h2 className="text-3xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-primary flex items-center gap-3 drop-shadow">
        <span className="material-symbols-outlined text-4xl bg-primary/20 text-primary rounded-full p-2 shadow-lg">badge</span>
        Chứng minh thư nhân dân
      </h2>
      <div className="space-y-6 mb-10">
        {docs.map((doc, idx) => (
          <div key={doc.key} className="bg-slate-900/50 rounded-2xl p-8 border-2 border-slate-700 hover:border-primary transition-all duration-300 shadow-xl">
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="bg-primary/20 rounded-full p-4 shadow-lg">
                  <span className="material-symbols-outlined text-3xl text-primary">{doc.icon}</span>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-100 mb-2">{doc.label}</h3>
                  <p className="text-slate-400 text-base">{data[doc.key] ? 'Đã tải ✓' : 'Chưa tải ảnh'}</p>
                </div>
              </div>
              <div className="flex-shrink-0">
                {data[doc.key] ? (
                  <img src={data[doc.key]} alt={doc.label} className="w-28 h-28 rounded-xl object-cover border-4 border-primary shadow-lg" />
                ) : (
                  <div className="w-28 h-28 rounded-xl border-2 border-dashed border-primary/60 bg-slate-800 flex items-center justify-center text-primary/60 cursor-pointer hover:bg-primary/10 transition-all duration-200" onClick={() => fileInputRefs.current[idx]?.click()}>
                    <span className="material-symbols-outlined text-4xl">upload</span>
                  </div>
                )}
              </div>
            </div>
            <input type="file" accept="image/*" className="hidden" ref={el => fileInputRefs.current[idx] = el} onChange={e => handleFileChange(idx, e)} />
            <button className="w-full mt-4 bg-gradient-to-r from-primary via-orange-400 to-orange-500 text-white font-extrabold py-3 rounded-xl shadow-lg text-base tracking-wide hover:scale-105 active:scale-95 transition-all duration-200" onClick={() => fileInputRefs.current[idx]?.click()}>{data[doc.key] ? 'Đổi ảnh' : 'Tải ảnh'}</button>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-8">
        <button className="flex-1 bg-slate-900 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all border-2 border-slate-700" onClick={prev}>Quay lại</button>
        <button className="flex-1 bg-gradient-to-r from-primary via-orange-400 to-orange-500 text-white font-extrabold py-4 rounded-xl text-lg shadow-lg tracking-wide hover:scale-105 active:scale-95 transition-all duration-200" onClick={next} disabled={docs.some(doc => !data[doc.key])}>Tiếp tục</button>
      </div>
    </div>
  );
}

function StepPersonal({ next, data, setData }: StepProps) {
  return (
    <div>
      <h2 className="text-3xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-primary flex items-center gap-3 drop-shadow">
        <span className="material-symbols-outlined text-4xl bg-primary/20 text-primary rounded-full p-2 shadow-lg">person</span>
        Thông tin cá nhân
      </h2>
      <div className="mb-8">
        <label className="block mb-3 font-extrabold text-lg text-slate-100">Họ và tên</label>
        <input className="w-full p-4 bg-slate-900/50 rounded-xl text-white text-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all border-2 border-slate-700 hover:border-primary" value={data.fullName || ''} onChange={e => setData({ ...data, fullName: e.target.value })} placeholder="Nhập họ và tên" />
      </div>
      <div className="mb-8">
        <label className="block mb-3 font-extrabold text-lg text-slate-100">Số điện thoại</label>
        <input className="w-full p-4 bg-slate-900/50 rounded-xl text-white text-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all border-2 border-slate-700 hover:border-primary" value={data.phone || ''} onChange={e => setData({ ...data, phone: e.target.value })} placeholder="Nhập số điện thoại" />
      </div>
      <div className="mb-10">
        <label className="block mb-3 font-extrabold text-lg text-slate-100">Email</label>
        <input className="w-full p-4 bg-slate-900/50 rounded-xl text-white text-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all border-2 border-slate-700 hover:border-primary" value={data.email || ''} onChange={e => setData({ ...data, email: e.target.value })} placeholder="Nhập email" />
      </div>
      <button className="w-full bg-gradient-to-r from-primary via-orange-400 to-orange-500 text-white font-extrabold py-4 rounded-xl text-xl shadow-lg tracking-wide hover:scale-105 active:scale-95 transition-all duration-200" onClick={next}>Tiếp tục</button>
    </div>
  );
}

function StepVehicle({ next, prev, data, setData }: StepProps) {
  return (
    <div>
      <h2 className="text-3xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-primary flex items-center gap-3 drop-shadow">
        <span className="material-symbols-outlined text-4xl bg-primary/20 text-primary rounded-full p-2 shadow-lg">directions_car</span>
        Thông tin phương tiện
      </h2>
      <div className="mb-8">
        <label className="block mb-3 font-extrabold text-lg text-slate-100">Loại xe</label>
        <select className="w-full p-4 bg-slate-900/50 rounded-xl text-white text-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all border-2 border-slate-700 hover:border-primary" value={data.vehicleType || ''} onChange={e => setData({ ...data, vehicleType: e.target.value })}>
          <option value="">Chọn loại xe</option>
          <option value="car">Ô tô</option>
          <option value="bike">Xe máy</option>
        </select>
      </div>
      <div className="mb-8">
        <label className="block mb-3 font-extrabold text-lg text-slate-100">Biển số</label>
        <input className="w-full p-4 bg-slate-900/50 rounded-xl text-white text-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all border-2 border-slate-700 hover:border-primary" value={data.vehiclePlate || ''} onChange={e => setData({ ...data, vehiclePlate: e.target.value })} placeholder="Nhập biển số xe" />
      </div>
      <div className="mb-10">
        <label className="block mb-3 font-extrabold text-lg text-slate-100">Model xe</label>
        <input className="w-full p-4 bg-slate-900/50 rounded-xl text-white text-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all border-2 border-slate-700 hover:border-primary" value={data.vehicleModel || ''} onChange={e => setData({ ...data, vehicleModel: e.target.value })} placeholder="Nhập model xe" />
      </div>
      <div className="flex gap-4">
        <button className="flex-1 bg-slate-900 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all border-2 border-slate-700" onClick={prev}>Quay lại</button>
        <button className="flex-1 bg-gradient-to-r from-primary via-orange-400 to-orange-500 text-white font-extrabold py-4 rounded-xl text-lg shadow-lg tracking-wide hover:scale-105 active:scale-95 transition-all duration-200" onClick={next}>Tiếp tục</button>
      </div>
    </div>
  );
}

function StepBank({ next, prev, data, setData }: StepProps) {
  return (
    <div>
      <h2 className="text-3xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-primary flex items-center gap-3 drop-shadow">
        <span className="material-symbols-outlined text-4xl bg-primary/20 text-primary rounded-full p-2 shadow-lg">account_balance</span>
        Tài khoản ngân hàng
      </h2>
      <div className="mb-8">
        <label className="block mb-3 font-extrabold text-lg text-slate-100">Chủ tài khoản</label>
        <input className="w-full p-4 bg-slate-900/50 rounded-xl text-white text-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all border-2 border-slate-700 hover:border-primary" value={data.bankAccountHolder || ''} onChange={e => setData({ ...data, bankAccountHolder: e.target.value })} placeholder="Nhập tên chủ tài khoản" />
      </div>
      <div className="mb-8">
        <label className="block mb-3 font-extrabold text-lg text-slate-100">Số tài khoản</label>
        <input className="w-full p-4 bg-slate-900/50 rounded-xl text-white text-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all border-2 border-slate-700 hover:border-primary" value={data.bankAccount || ''} onChange={e => setData({ ...data, bankAccount: e.target.value })} placeholder="Nhập số tài khoản" />
      </div>
      <div className="mb-10">
        <label className="block mb-3 font-extrabold text-lg text-slate-100">Ngân hàng</label>
        <input className="w-full p-4 bg-slate-900/50 rounded-xl text-white text-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all border-2 border-slate-700 hover:border-primary" value={data.bankName || ''} onChange={e => setData({ ...data, bankName: e.target.value })} placeholder="Nhập tên ngân hàng" />
      </div>
      <div className="flex gap-4">
        <button className="flex-1 bg-slate-900 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all border-2 border-slate-700" onClick={prev}>Quay lại</button>
        <button className="flex-1 bg-gradient-to-r from-primary via-orange-400 to-orange-500 text-white font-extrabold py-4 rounded-xl text-lg shadow-lg tracking-wide hover:scale-105 active:scale-95 transition-all duration-200" onClick={next}>Tiếp tục</button>
      </div>
    </div>
  );
}

function StepUpload({ next, prev, data, setData, label, keyName, icon }: StepProps & { label: string; keyName: string; icon: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setData({ ...data, [keyName]: ev.target?.result });
      };
      reader.readAsDataURL(file);
    }
  };
  return (
    <div>
      <h2 className="text-3xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-primary flex items-center gap-3 drop-shadow">
        <span className="material-symbols-outlined text-4xl bg-primary/20 text-primary rounded-full p-2 shadow-lg">{icon}</span>
        {label}
      </h2>
      <div className="mb-10 flex flex-col items-center gap-7">
        {data[keyName] ? (
          <img src={data[keyName]} alt={label} className="w-52 h-52 rounded-2xl object-cover border-4 border-primary shadow-2xl transition-all duration-300" />
        ) : (
          <div className="w-52 h-52 rounded-2xl border-2 border-dashed border-primary/60 bg-slate-900 flex items-center justify-center text-primary/60 text-6xl cursor-pointer hover:bg-primary/10 transition-all duration-200" onClick={() => fileInputRef.current?.click()}>
            <span className="material-symbols-outlined text-6xl">upload</span>
          </div>
        )}
        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
        <button className="bg-gradient-to-r from-primary via-orange-400 to-orange-500 text-white font-extrabold py-3 px-8 rounded-xl shadow-lg text-lg tracking-wide hover:scale-105 active:scale-95 transition-all duration-200" onClick={() => fileInputRef.current?.click()}>{data[keyName] ? 'Đổi ảnh' : 'Tải ảnh'}</button>
      </div>
      <div className="flex gap-4 mt-6">
        <button className="flex-1 bg-slate-900 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all border-2 border-slate-700" onClick={prev}>Quay lại</button>
        <button className="flex-1 bg-gradient-to-r from-primary via-orange-400 to-orange-500 text-white font-extrabold py-4 rounded-xl text-lg shadow-lg tracking-wide hover:scale-105 active:scale-95 transition-all duration-200" onClick={next} disabled={!data[keyName]}>Tiếp tục</button>
      </div>
    </div>
  );
}

function StepConfirm({ prev, data }: StepProps) {
  return (
    <div>
      <h2 className="text-3xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-primary flex items-center gap-3 drop-shadow">
        <span className="material-symbols-outlined text-4xl bg-primary/20 text-primary rounded-full p-2 shadow-lg">check_circle</span>
        Xác nhận thông tin
      </h2>
      <div className="mb-10 bg-slate-900/50 rounded-xl p-6 border-2 border-slate-700">
        <div className="grid grid-cols-2 gap-6 text-slate-100 text-lg mb-8">
          <div>
            <div className="font-semibold text-primary mb-1">Họ tên:</div>
            <div className="text-slate-100 font-medium">{data.fullName}</div>
          </div>
          <div>
            <div className="font-semibold text-primary mb-1">SĐT:</div>
            <div className="text-slate-100 font-medium">{data.phone}</div>
          </div>
          <div>
            <div className="font-semibold text-primary mb-1">Email:</div>
            <div className="text-slate-100 font-medium">{data.email}</div>
          </div>
          <div>
            <div className="font-semibold text-primary mb-1">Loại xe:</div>
            <div className="text-slate-100 font-medium">{data.vehicleType === 'car' ? 'Ô tô' : 'Xe máy'}</div>
          </div>
          <div>
            <div className="font-semibold text-primary mb-1">Biển số:</div>
            <div className="text-slate-100 font-medium">{data.vehiclePlate}</div>
          </div>
          <div>
            <div className="font-semibold text-primary mb-1">Model xe:</div>
            <div className="text-slate-100 font-medium">{data.vehicleModel}</div>
          </div>
          <div>
            <div className="font-semibold text-primary mb-1">Chủ tài khoản:</div>
            <div className="text-slate-100 font-medium">{data.bankAccountHolder}</div>
          </div>
          <div>
            <div className="font-semibold text-primary mb-1">Số tài khoản:</div>
            <div className="text-slate-100 font-medium">{data.bankAccount}</div>
          </div>
          <div className="col-span-2">
            <div className="font-semibold text-primary mb-1">Ngân hàng:</div>
            <div className="text-slate-100 font-medium">{data.bankName}</div>
          </div>
        </div>
        <h3 className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">photo_camera</span>
          Ảnh & Giấy tờ
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { src: data.driverPhoto, label: 'Ảnh chân dung' },
            { src: data.vehicleDocument, label: 'Giấy tờ xe' },
            { src: data.insuranceDocument, label: 'Bảo hiểm xe' },
            { src: data.licenseDocument, label: 'Bằng lái xe' },
            { src: data.idCardFront, label: 'CCCD mặt trước' },
            { src: data.idCardBack, label: 'CCCD mặt sau' },
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center">
              {item.src ? (
                <img src={item.src} alt={item.label} className="w-24 h-24 rounded-xl object-cover border-2 border-primary shadow-lg mb-2" />
              ) : (
                <div className="w-24 h-24 rounded-xl bg-slate-700 border-2 border-dashed border-slate-600 flex items-center justify-center mb-2 text-slate-500">
                  <span className="material-symbols-outlined">image</span>
                </div>
              )}
              <span className="text-xs font-semibold text-slate-200 text-center">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-4">
        <button className="flex-1 bg-slate-900 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all border-2 border-slate-700" onClick={prev}>Quay lại</button>
        <button className="flex-1 bg-gradient-to-r from-primary via-orange-400 to-orange-500 text-white font-extrabold py-4 rounded-xl text-lg shadow-lg tracking-wide hover:scale-105 active:scale-95 transition-all duration-200" onClick={() => alert('Đã lưu (demo)!')}>Hoàn tất</button>
      </div>
    </div>
  );
}

export default function AddDriverPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<any>({});
  const stepLabels = [
    { icon: 'person', label: 'Cá nhân' },
    { icon: 'directions_car', label: 'Phương tiện' },
    { icon: 'account_balance', label: 'Ngân hàng' },
    { icon: 'photo_camera', label: 'Ảnh chân dung' },
    { icon: 'folder_copy', label: 'Giấy tờ' },
    { icon: 'badge', label: 'CCCD' },
    { icon: 'check_circle', label: 'Xác nhận' },
  ];
  return (
    <Layout>
      <div className="min-h-[calc(100vh-64px)] w-screen bg-gradient-to-br from-[#1a1d2b] via-[#23272f] to-[#181c23] flex flex-col relative overflow-hidden">
        <div className="w-full max-w-6xl mx-auto px-12 pt-12 pb-6 flex flex-col items-center z-10">
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-primary to-cyan-400 mb-3 tracking-tight drop-shadow-[0_2px_16px_rgba(255,140,0,0.25)]">Thêm tài xế mới</h1>
          <p className="text-slate-100 mb-10 text-center text-2xl font-semibold z-10 drop-shadow">Vui lòng nhập đầy đủ thông tin và giấy tờ để đăng ký tài xế mới vào hệ thống.</p>
          <div className="flex items-center justify-center gap-0 mb-8 w-full max-w-5xl z-10">
            {stepLabels.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center flex-1">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center font-black text-3xl border-4 transition-all duration-300 shadow-xl mb-2 ${step === idx+1 ? 'bg-gradient-to-br from-orange-400 via-primary to-cyan-400 text-white border-orange-300 scale-110 animate-pulse' : step > idx+1 ? 'bg-primary/80 text-white border-primary/60' : 'bg-slate-900 text-slate-500 border-slate-700'}`}>
                  <span className={`material-symbols-outlined text-4xl mr-1 ${step === idx+1 ? 'animate-bounce' : ''}`}>{item.icon}</span>
                  {idx+1}
                </div>
                <span className={`mt-1 text-sm font-extrabold tracking-widest uppercase ${step === idx+1 ? 'text-orange-400 drop-shadow' : 'text-slate-400'}`}>{item.label}</span>
                {idx < stepLabels.length-1 && <div className={`h-2 flex-1 mx-1 rounded transition-all duration-300 ${step > idx+1 ? 'bg-gradient-to-r from-primary to-orange-400' : 'bg-slate-700'}`}></div>}
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 w-full bg-gradient-to-br from-white/20 via-white/10 to-[#23272f]/60 backdrop-blur-2xl flex items-center justify-center px-12 pb-12 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{boxShadow:'inset 0 8px 32px 0 rgba(255,140,0,0.08)'}} />
          <div className="w-full max-w-4xl z-10">
            <div className="transition-all duration-500 ease-in-out">
              {step === 1 && <StepPersonal next={() => setStep(2)} data={data} setData={setData} />}
              {step === 2 && <StepVehicle next={() => setStep(3)} prev={() => setStep(1)} data={data} setData={setData} />}
              {step === 3 && <StepBank next={() => setStep(4)} prev={() => setStep(2)} data={data} setData={setData} />}
              {step === 4 && <StepUpload label="Ảnh chân dung tài xế" keyName="driverPhoto" icon="person" prev={() => setStep(3)} next={() => setStep(5)} data={data} setData={setData} />}
              {step === 5 && <StepUploadDocuments prev={() => setStep(4)} next={() => setStep(6)} data={data} setData={setData} />}
              {step === 6 && <StepUploadCCCD prev={() => setStep(5)} next={() => setStep(7)} data={data} setData={setData} />}
              {step === 7 && <StepConfirm prev={() => setStep(6)} data={data} setData={setData} />}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
