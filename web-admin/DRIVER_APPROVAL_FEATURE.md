# Trang Duyệt Tài Xế - Tính Năng Chi Tiết

## 📋 Tổng Quan
Trang duyệt tài xế cho phép quản trị viên xem xét, duyệt hoặc từ chối các tài xế đang chờ xác nhận. Trang này hiển thị toàn bộ thông tin tài xế bao gồm tất cả giấy tờ, hình ảnh và tài chính.

## 🗺️ Cấu Trúc Tệp
```
src/
├── pages/
│   └── driver-approval.tsx          # Trang danh sách tài xế chờ duyệt
├── components/
│   └── DriverApprovalModal.tsx      # Modal chi tiết và duyệt tài xế
└── services/
    └── api.ts                        # Thêm hàm approveDriver & rejectDriver
```

## ✨ Tính Năng Chính

### 1. Danh Sách Tài Xế Chờ Duyệt
- Hiển thị danh sách tất cả tài xế với trạng thái "Chờ duyệt"
- Tìm kiếm theo tên, email, số điện thoại
- Hiển thị thông tin cơ bản: tên, email, điện thoại, biển số xe, ngày đăng ký

### 2. Modal Xem Chi Tiết & Duyệt

#### Phần Xem Chi Tiết (View Mode)
Hiển thị đầy đủ thông tin tài xế:

**Giấy tờ và Hình Ảnh:**
- Ảnh chân dung tài xế
- Giấy tờ xe
- Bảo hiểm xe
- Bằng lái xe
- CCCD mặt trước
- CCCD mặt sau

**Thông Tin Cá Nhân:**
- Họ tên
- Email
- Số điện thoại

**Thông Tin Phương Tiện:**
- Loại xe (Ô tô/Xe máy)
- Biển số
- Model xe
- Màu xe

**Thông Tin Ngân Hàng:**
- Chủ tài khoản
- Số tài khoản
- Ngân hàng

#### Chế Độ Duyệt (Approve Mode)
- Xác nhận tất cả giấy tờ đã hợp lệ
- Ghi chú tùy chọn
- Nút "Xác nhận duyệt" để kích hoạt tài xế

#### Chế Độ Từ Chối (Reject Mode)
Cho phép từ chối với chi tiết cụ thể:

**Chọn Tài Liệu Cần Chỉnh Sửa:**
- Chọn từng mục cần tài xế sửa lại (ví dụ: CCCD mờ, giấy tờ xe chụp mờ)
- Giao diện chọn trực quan với check mark

**Nhập Lý Do Cho Từng Tài Liệu:**
- Mỗi tài liệu được chọn có ô nhập lý do riêng
- Ví dụ: "Ảnh quá mờ, vui lòng chụp lại" hoặc "Chứng chỉ không khớp với hồ sơ"

**Lý Do Từ Chối Chung:**
- Nhập lý do chung nếu không liên quan đến tài liệu cụ thể
- Ví dụ: "Hồ sơ không đầy đủ thông tin cá nhân"

**Gửi Từ Chối:**
- Tài xế sẽ nhận được thông báo với chi tiết những phần cần chỉnh sửa
- Có thể yêu cầu chụp lại ảnh, sửa sai, cung cấp giấy tờ thiếu...

## 🔌 API Integration

### Hàm Mới Thêm vào apiService:

```typescript
// Duyệt tài xế
async approveDriver(id: string, data?: any): Promise<Driver> {
  // POST /api/drivers/{id}/approve
}

// Từ chối tài xế
async rejectDriver(id: string, rejectionData: any): Promise<any> {
  // POST /api/drivers/{id}/reject
  // rejectionData: {
  //   rejectedDocuments: ['driverPhoto', 'idCardFront'],
  //   reasons: {
  //     driverPhoto: 'Ảnh quá mờ',
  //     idCardFront: 'CCCD không rõ'
  //   },
  //   globalReason: 'Cần sửa...'
  // }
}
```

## 🎨 UI/UX Highlights

- **Thiết kế Gradient Modern:** Sử dụng gradient màu primary cho header
- **Grid Layout:** Hiển thị hình ảnh giấy tờ trong grid 2-3 cột
- **Color Coding:** 
  - Xanh lá cho duyệt ✓
  - Đỏ cho từ chối ✗
  - Vàng cho trạng thái chờ
- **Responsive Design:** Hoạt động tốt trên desktop, tablet, mobile
- **Dark Mode Support:** Hỗ trợ chế độ sáng/tối

## 📱 Workflow

1. **Admin truy cập trang "Duyệt tài xế"**
2. **Nhấp vào "Xem & Duyệt"** để xem chi tiết tài xế
3. **Xem tất cả thông tin:**
   - Ảnh, giấy tờ, thông tin cá nhân, phương tiện, ngân hàng
4. **Chọn hành động:**
   - **Duyệt:** Nhấp "Duyệt tài xế", ghi chú (nếu cần), nhấp "Xác nhận duyệt"
   - **Từ chối:** Nhấp "Từ chối", chọn mục cần sửa, nhập lý do, nhấp "Gửi từ chối"
5. **Tài xế nhận thông báo:**
   - Duyệt: Kích hoạt tài khoản, có thể đi chở khách
   - Từ chối: Nhận thông báo chi tiết những phần cần chỉnh sửa

## 🔐 Permissions
Chỉ Admin có thể truy cập trang này (cần kiểm tra role khi triển khai)

## 📝 Notes
- Trang được thêm vào menu sidebar với icon "check_circle"
- Route: `/driver-approval`
- Có thể mở rộng sau này để thêm chức năng:
  - Lịch sử duyệt/từ chối
  - Bố cục theo từng mục (Personal, Vehicle, Documents, Bank)
  - Export báo cáo duyệt
