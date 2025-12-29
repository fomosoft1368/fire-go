import React, { useState } from 'react';

interface DocumentItem {
  key: string;
  label: string;
  src?: string;
  status?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

interface DriverApprovalModalProps {
  driver: any;
  onClose: () => void;
  onApprove: (driverId: string, notes?: string) => void;
  onReject: (driverId: string, rejectionDetails: any) => void;
}

const DriverApprovalModal: React.FC<DriverApprovalModalProps> = ({
  driver,
  onClose,
  onApprove,
  onReject,
}) => {
  const [approvalMode, setApprovalMode] = useState<'view' | 'approve' | 'reject'>('view');
  const [rejectionReasons, setRejectionReasons] = useState<{
    [key: string]: string;
  }>({});
  const [globalReason, setGlobalReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [validationError, setValidationError] = useState('');

  if (!driver) return null;

  const documents: DocumentItem[] = [
    { key: 'driverPhoto', label: 'Ảnh chân dung', src: driver.driverPhoto },
    { key: 'vehicleDocument', label: 'Giấy tờ xe', src: driver.vehicleDocument },
    { key: 'insuranceDocument', label: 'Bảo hiểm xe', src: driver.insuranceDocument },
    { key: 'licenseDocument', label: 'Bằng lái xe', src: driver.licenseDocument },
    { key: 'idCardFront', label: 'CCCD mặt trước', src: driver.idCardFront },
    { key: 'idCardBack', label: 'CCCD mặt sau', src: driver.idCardBack },
  ];

  const handleRejectDocument = (docKey: string) => {
    if (selectedDocuments.has(docKey)) {
      selectedDocuments.delete(docKey);
      setSelectedDocuments(new Set(selectedDocuments));
    } else {
      setSelectedDocuments(new Set([...selectedDocuments, docKey]));
    }
  };

  const handleSubmitApproval = () => {
    onApprove(driver._id || driver.id, approvalNotes);
  };

  const handleSubmitRejection = () => {
    if (selectedDocuments.size === 0 && !globalReason) {
      setValidationError('Vui lòng chọn ít nhất một tài liệu cần chỉnh sửa hoặc nhập lý do từ chối chung');
      return;
    }

    setValidationError('');
    const rejectionDetails = {
      rejectedDocuments: Array.from(selectedDocuments),
      reasons: rejectionReasons,
      globalReason,
    };

    onReject(driver._id || driver.id, rejectionDetails);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl w-full max-w-5xl shadow-2xl relative border border-slate-700 my-8">
        <button
          className="sticky top-4 right-4 text-slate-400 hover:text-primary z-10 bg-slate-800/80 p-2 rounded-full hover:bg-primary/20 transition-all ml-auto mr-4"
          onClick={onClose}
        >
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="mb-8 border-b border-slate-700 pb-8">
            <div className="flex items-start gap-6">
              <img
                src={`https://i.pravatar.cc/150?u=${driver.bankAccountHolder || driver.userId}`}
                alt={driver.displayName}
                className="w-24 h-24 rounded-2xl border-4 border-primary shadow-lg object-cover"
              />
              <div className="flex-1">
                <h2 className="text-3xl font-black text-white mb-2">{driver.displayName}</h2>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-slate-400">Email</span>
                    <div className="font-semibold text-white">{driver.email || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Điện thoại</span>
                    <div className="font-semibold text-white">{driver.phone || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Biển số</span>
                    <div className="font-semibold text-white font-mono">{driver.vehiclePlate || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Model xe</span>
                    <div className="font-semibold text-white">{driver.vehicleModel || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mode Selection */}
          {approvalMode === 'view' && (
            <>
              {/* Documents Section */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">photo_camera</span>
                  Giấy tờ và hình ảnh
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {documents.map((doc) => (
                    <div key={doc.key} className="group">
                      <div className="relative mb-2 rounded-2xl overflow-hidden border-2 border-slate-700 hover:border-primary transition-all bg-slate-800">
                        {doc.src ? (
                          <img
                            src={doc.src}
                            alt={doc.label}
                            className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-48 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-slate-500">
                            <span className="material-symbols-outlined text-5xl">image_not_supported</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-200">{doc.label}</p>
                      <p className={`text-xs ${doc.src ? 'text-green-400' : 'text-red-400'}`}>
                        {doc.src ? '✓ Có' : '✗ Thiếu'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Personal Info Section */}
              <div className="mb-8 border-t border-slate-700 pt-8">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">person</span>
                  Thông tin cá nhân
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <div className="text-xs text-slate-400 mb-2">Họ tên</div>
                    <div className="font-bold text-white">{driver.fullName || 'N/A'}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <div className="text-xs text-slate-400 mb-2">Email</div>
                    <div className="font-bold text-white text-sm break-all">{driver.email || 'N/A'}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <div className="text-xs text-slate-400 mb-2">Điện thoại</div>
                    <div className="font-bold text-white font-mono">{driver.phone || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Vehicle Info Section */}
              <div className="mb-8 border-t border-slate-700 pt-8">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">directions_car</span>
                  Thông tin phương tiện
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <div className="text-xs text-slate-400 mb-2">Loại xe</div>
                    <div className="font-bold text-white">
                      {driver.vehicleType === 'car' ? 'Ô tô' : driver.vehicleType === 'bike' ? 'Xe máy' : 'N/A'}
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <div className="text-xs text-slate-400 mb-2">Biển số</div>
                    <div className="font-bold text-white font-mono">{driver.vehiclePlate || 'N/A'}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <div className="text-xs text-slate-400 mb-2">Model</div>
                    <div className="font-bold text-white">{driver.vehicleModel || 'N/A'}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <div className="text-xs text-slate-400 mb-2">Màu xe</div>
                    <div className="font-bold text-white">{driver.vehicleColor || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Bank Info Section */}
              <div className="mb-8 border-t border-slate-700 pt-8">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">account_balance</span>
                  Thông tin ngân hàng
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 md:col-span-1">
                    <div className="text-xs text-slate-400 mb-2">Chủ tài khoản</div>
                    <div className="font-bold text-white">{driver.bankAccountHolder || 'N/A'}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 md:col-span-1">
                    <div className="text-xs text-slate-400 mb-2">Số tài khoản</div>
                    <div className="font-bold text-white font-mono">{driver.bankAccount || 'N/A'}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 md:col-span-1">
                    <div className="text-xs text-slate-400 mb-2">Ngân hàng</div>
                    <div className="font-bold text-white">{driver.bankName || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mt-8 border-t border-slate-700 pt-8">
                <button
                  onClick={() => setApprovalMode('approve')}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 rounded-xl hover:scale-105 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">check_circle</span>
                  Duyệt tài xế
                </button>
                <button
                  onClick={() => setApprovalMode('reject')}
                  className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold py-4 rounded-xl hover:scale-105 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">cancel</span>
                  Từ chối
                </button>
              </div>
            </>
          )}

          {/* Approval Mode */}
          {approvalMode === 'approve' && (
            <div className="border-t border-slate-700 pt-8">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <span className="material-symbols-outlined text-green-400">check_circle</span>
                Duyệt tài xế
              </h3>
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 mb-6">
                <p className="text-green-300 mb-4">
                  Tất cả giấy tờ đã được xác nhận. Nhấn "Xác nhận duyệt" để kích hoạt tài xế trong hệ thống.
                </p>
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-3">
                    Ghi chú (tùy chọn)
                  </label>
                  <textarea
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="Nhập ghi chú thêm nếu cần..."
                    className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    rows={4}
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setApprovalMode('view')}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all"
                >
                  Quay lại
                </button>
                <button
                  onClick={handleSubmitApproval}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 rounded-xl hover:scale-105 transition-all shadow-lg"
                >
                  Xác nhận duyệt
                </button>
              </div>
            </div>
          )}

          {/* Rejection Mode */}
          {approvalMode === 'reject' && (
            <div className="border-t border-slate-700 pt-8">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <span className="material-symbols-outlined text-red-400">cancel</span>
                Từ chối duyệt
              </h3>

              {/* Document Rejection Section */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-slate-200 mb-4">
                  Chọn tài liệu cần chỉnh sửa
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {documents.map((doc) => (
                    <div
                      key={doc.key}
                      onClick={() => handleRejectDocument(doc.key)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedDocuments.has(doc.key)
                          ? 'border-red-500 bg-red-500/10'
                          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-white">{doc.label}</p>
                          <p className="text-xs text-slate-400 mt-1">{doc.src ? 'Có' : 'Thiếu'}</p>
                        </div>
                        {selectedDocuments.has(doc.key) && (
                          <span className="material-symbols-outlined text-red-400 text-xl">
                            check_circle
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reason Section */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-slate-200 mb-3">
                  Lý do từ chối cho từng tài liệu
                </label>
                <div className="space-y-4">
                  {Array.from(selectedDocuments).map((docKey) => {
                    const doc = documents.find((d) => d.key === docKey);
                    return (
                      <div key={docKey} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <label className="block text-xs font-semibold text-slate-300 mb-2">
                          {doc?.label}
                        </label>
                        <textarea
                          value={rejectionReasons[docKey] || ''}
                          onChange={(e) =>
                            setRejectionReasons({
                              ...rejectionReasons,
                              [docKey]: e.target.value,
                            })
                          }
                          placeholder={`Ví dụ: Ảnh quá mờ, vui lòng chụp lại... hoặc Chứng chỉ không khớp với hồ sơ...`}
                          className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                          rows={2}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Global Reason */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-slate-200 mb-3">
                  Lý do từ chối chung (nếu cần)
                </label>
                <textarea
                  value={globalReason}
                  onChange={(e) => setGlobalReason(e.target.value)}
                  placeholder="Nhập lý do chung từ chối nếu không liên quan đến tài liệu cụ thể..."
                  className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>

              {validationError && (
                <div className="p-4 bg-red-500/10 border border-red-500 rounded-xl text-red-400 text-sm">
                  {validationError}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setApprovalMode('view')}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all"
                >
                  Quay lại
                </button>
                <button
                  onClick={handleSubmitRejection}
                  className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold py-3 rounded-xl hover:scale-105 transition-all shadow-lg"
                >
                  Gửi từ chối
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverApprovalModal;
