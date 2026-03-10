import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { legalDocsService, TermsOfService, PrivacyPolicy } from '../services/legalDocsService';

type DocType = 'terms' | 'privacy';
type UserType = 'driver' | 'customer';

const LegalDocumentsManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DocType>('terms');
  const [terms, setTerms] = useState<TermsOfService[]>([]);
  const [privacy, setPrivacy] = useState<PrivacyPolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<TermsOfService | PrivacyPolicy | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    language: 'vi',
    userType: 'driver' as UserType,
    title: '',
    version: '1.0.0',
    introduction: '',
    sections: [] as any[],
    contactEmail: '',
    contactPhone: '',
    contactAddress: '',
  });

  useEffect(() => {
    loadDocuments();
  }, [activeTab]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      if (activeTab === 'terms') {
        const data = await legalDocsService.getAllTerms();
        setTerms(data);
      } else {
        const data = await legalDocsService.getAllPrivacy();
        setPrivacy(data);
      }
    } catch (error: any) {
      showMessage('error', error.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleEdit = (doc: TermsOfService | PrivacyPolicy) => {
    setSelectedDoc(doc);
    setFormData({
      language: doc.language,
      userType: doc.userType as UserType,
      title: doc.title,
      version: doc.version,
      introduction: doc.content.introduction,
      sections: doc.content.sections || [],
      contactEmail: doc.content.contactInfo?.email || '',
      contactPhone: doc.content.contactInfo?.phone || '',
      contactAddress: doc.content.contactInfo?.address || '',
    });
    setShowEditor(true);
  };

  const handleCreate = () => {
    setSelectedDoc(null);
    setFormData({
      language: 'vi',
      userType: 'driver',
      title: activeTab === 'terms' ? 'Điều khoản dịch vụ' : 'Chính sách bảo mật',
      version: '1.0.0',
      introduction: '',
      sections: [],
      contactEmail: 'support@firego.vn',
      contactPhone: '1900 xxxx',
      contactAddress: 'Nghệ An, Việt Nam',
    });
    setShowEditor(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        language: formData.language,
        userType: formData.userType,
        title: formData.title,
        version: formData.version,
        content: {
          introduction: formData.introduction,
          sections: formData.sections,
          contactInfo: {
            email: formData.contactEmail,
            phone: formData.contactPhone,
            address: formData.contactAddress,
          },
        },
      };

      if (selectedDoc) {
        // Update
        if (activeTab === 'terms') {
          await legalDocsService.updateTerms(selectedDoc._id!, payload);
        } else {
          await legalDocsService.updatePrivacy(selectedDoc._id!, payload);
        }
        showMessage('success', 'Cập nhật thành công');
      } else {
        // Create
        if (activeTab === 'terms') {
          await legalDocsService.createTerms(payload);
        } else {
          await legalDocsService.createPrivacy(payload);
        }
        showMessage('success', 'Tạo mới thành công');
      }

      setShowEditor(false);
      loadDocuments();
    } catch (error: any) {
      showMessage('error', error.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tài liệu này?')) return;

    setLoading(true);
    try {
      if (activeTab === 'terms') {
        await legalDocsService.deleteTerms(id);
      } else {
        await legalDocsService.deletePrivacy(id);
      }
      showMessage('success', 'Xóa thành công');
      loadDocuments();
    } catch (error: any) {
      showMessage('error', error.message || 'Không thể xóa');
    } finally {
      setLoading(false);
    }
  };

  const addSection = () => {
    setFormData({
      ...formData,
      sections: [
        ...formData.sections,
        { title: '', content: '', bulletPoints: [] },
      ],
    });
  };

  const updateSection = (index: number, field: string, value: any) => {
    const newSections = [...formData.sections];
    newSections[index] = { ...newSections[index], [field]: value };
    setFormData({ ...formData, sections: newSections });
  };

  const deleteSection = (index: number) => {
    const newSections = formData.sections.filter((_, i) => i !== index);
    setFormData({ ...formData, sections: newSections });
  };

  const addBulletPoint = (sectionIndex: number) => {
    const newSections = [...formData.sections];
    if (!newSections[sectionIndex].bulletPoints) {
      newSections[sectionIndex].bulletPoints = [];
    }
    newSections[sectionIndex].bulletPoints.push('');
    setFormData({ ...formData, sections: newSections });
  };

  const updateBulletPoint = (sectionIndex: number, bulletIndex: number, value: string) => {
    const newSections = [...formData.sections];
    newSections[sectionIndex].bulletPoints[bulletIndex] = value;
    setFormData({ ...formData, sections: newSections });
  };

  const deleteBulletPoint = (sectionIndex: number, bulletIndex: number) => {
    const newSections = [...formData.sections];
    newSections[sectionIndex].bulletPoints = newSections[sectionIndex].bulletPoints.filter(
      (_: any, i: number) => i !== bulletIndex
    );
    setFormData({ ...formData, sections: newSections });
  };

  const documents = activeTab === 'terms' ? terms : privacy;

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            Quản lý Tài liệu Pháp lý
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Quản lý điều khoản dịch vụ và chính sách bảo mật
          </p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'terms'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            <span className="material-symbols-outlined">description</span>
            Điều khoản dịch vụ
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'privacy'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            <span className="material-symbols-outlined">privacy_tip</span>
            Chính sách bảo mật
          </button>
        </div>

        {!showEditor ? (
          <>
            {/* Create Button */}
            <div className="mb-4">
              <button
                onClick={handleCreate}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2"
              >
                <span className="material-symbols-outlined">add_circle</span>
                Tạo mới
              </button>
            </div>

            {/* Documents List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tiêu đề
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Loại người dùng
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Ngôn ngữ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Phiên bản
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Cập nhật
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        Đang tải...
                      </td>
                    </tr>
                  ) : documents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        Chưa có tài liệu nào
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc) => (
                      <tr key={doc._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                          {doc.title}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              doc.userType === 'driver'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                            }`}
                          >
                            {doc.userType === 'driver' ? 'Tài xế' : 'Khách hàng'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                          {doc.language === 'vi' ? '🇻🇳 Tiếng Việt' : '🇬🇧 English'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                          v{doc.version}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {doc.isActive ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-xs font-semibold">
                              ✓ Kích hoạt
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 rounded-full text-xs font-semibold">
                              Không kích hoạt
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                          {doc.lastModifiedAt
                            ? new Date(doc.lastModifiedAt).toLocaleDateString('vi-VN')
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-right text-sm">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleEdit(doc)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                              Sửa
                            </button>
                            <button
                              onClick={() => handleDelete(doc._id!)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* Editor View */
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
              {selectedDoc ? 'Chỉnh sửa tài liệu' : 'Tạo tài liệu mới'}
            </h2>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tiêu đề
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Điều khoản dịch vụ"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phiên bản
                </label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="1.0.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Loại người dùng
                </label>
                <select
                  value={formData.userType}
                  onChange={(e) => setFormData({ ...formData, userType: e.target.value as UserType })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="driver">Tài xế</option>
                  <option value="customer">Khách hàng</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ngôn ngữ
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            {/* Introduction */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Giới thiệu
              </label>
              <textarea
                value={formData.introduction}
                onChange={(e) => setFormData({ ...formData, introduction: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Nội dung giới thiệu..."
              />
            </div>

            {/* Sections */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Các phần nội dung
                </label>
                <button
                  onClick={addSection}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  Thêm phần
                </button>
              </div>

              {formData.sections.map((section, index) => (
                <div key={index} className="mb-4 p-4 border rounded-lg dark:border-gray-600">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-gray-800 dark:text-white">
                      Phần {index + 1}
                    </h4>
                    <button
                      onClick={() => deleteSection(index)}
                      className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                      Xóa
                    </button>
                  </div>
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => updateSection(index, 'title', e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg mb-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Tiêu đề phần..."
                  />
                  <textarea
                    value={section.content}
                    onChange={(e) => updateSection(index, 'content', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg mb-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Nội dung..."
                  />

                  {/* Bullet Points */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Danh sách điểm
                      </label>
                      <button
                        onClick={() => addBulletPoint(index)}
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-base">add_circle_outline</span>
                        Thêm điểm
                      </button>
                    </div>
                    {section.bulletPoints?.map((bullet: string, bulletIndex: number) => (
                      <div key={bulletIndex} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={bullet}
                          onChange={(e) =>
                            updateBulletPoint(index, bulletIndex, e.target.value)
                          }
                          className="flex-1 px-3 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                          placeholder="Điểm..."
                        />
                        <button
                          onClick={() => deleteBulletPoint(index, bulletIndex)}
                          className="text-red-600 hover:text-red-800 text-sm px-2"
                        >
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Contact Info */}
            <div className="mb-6 p-4 border rounded-lg dark:border-gray-600">
              <h4 className="font-semibold text-gray-800 dark:text-white mb-4">
                Thông tin liên hệ
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, contactEmail: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="support@firego.vn"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Điện thoại
                  </label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, contactPhone: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="1900 xxxx"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Địa chỉ
                  </label>
                  <input
                    type="text"
                    value={formData.contactAddress}
                    onChange={(e) =>
                      setFormData({ ...formData, contactAddress: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Nghệ An, Việt Nam"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                <span className="material-symbols-outlined">save</span>
                {loading ? 'Đang lưu...' : 'Lưu'}
              </button>
              <button
                onClick={() => setShowEditor(false)}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold flex items-center gap-2"
              >
                <span className="material-symbols-outlined">close</span>
                Hủy
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LegalDocumentsManagement;
