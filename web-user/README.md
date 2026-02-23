# FireGo Landing Page

Website landing page hiện đại cho ứng dụng FireGo - nền tảng di chuyển thông minh.

## 🚀 Tính năng

- **Hero Section**: Giới thiệu ứng dụng với CTA rõ ràng
- **Features**: 6 tính năng chính của FireGo
- **How It Works**: Quy trình sử dụng 4 bước
- **Driver Benefits**: Lợi ích và điều kiện trở thành tài xế
- **Stats**: Thống kê về người dùng, tài xế và chuyến đi
- **Testimonials**: Đánh giá từ khách hàng và tài xế
- **Download**: Hướng dẫn và yêu cầu tải ứng dụng
- **FAQ**: Câu hỏi thường gặp với giải đáp chi tiết
- **CTA**: Call-to-action cuối cùng cho hai nhóm người dùng
- **Footer**: Liên kết, mạng xã hội và thông tin công ty

## 🛠️ Công nghệ

- **React 18** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - CSS framework
- **React Icons** - Icon library
- **TypeScript** - Type safety

## 📦 Cấu trúc thư mục

```
web-user/
├── src/
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── HowWorks.tsx
│   │   ├── DriverBenefit.tsx
│   │   ├── Stats.tsx
│   │   ├── Testimonials.tsx
│   │   ├── Download.tsx
│   │   ├── FAQ.tsx
│   │   ├── CTA.tsx
│   │   └── Footer.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## 🚀 Bắt đầu

### Cài đặt dependencies

```bash
npm install
```

### Chạy dev server

```bash
npm run dev
```

Server sẽ chạy tại `http://localhost:3001`

### Build production

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## 🎨 Màu sắc chính

- Primary: `#FF6B00` (Orange)
- Secondary: `#0f172a` (Dark Blue)
- Accent: `#10b981` (Green)

## 📱 Responsive Design

Website được thiết kế responsive cho:
- Mobile (< 640px)
- Tablet (640px - 1024px)
- Desktop (> 1024px)

## 🔄 Sections

### 1. Header
- Logo với branding
- Menu điều hướng
- Mobile hamburger menu
- CTA buttons

### 2. Hero
- Headline chính
- Subheading
- Statistics highlight
- Dual CTA buttons
- Download links

### 3. Features
- 6 features grid
- Icons và descriptions
- Hover effects

### 4. How It Works
- 4 steps process
- Visual demo
- Feature highlights

### 5. Driver Benefits
- 4 benefit cards
- Requirements checklist
- CTA for driver registration

### 6. Stats
- 4 key statistics
- Gradient background

### 7. Testimonials
- 3 customer testimonials
- Star ratings
- User avatars

### 8. Download
- Download buttons
- QR code section
- System requirements

### 9. FAQ
- 6 FAQs
- Expandable accordion
- Contact support CTA

### 10. CTA Final
- Dual CTAs (user/driver)
- Trust badges

### 11. Footer
- Company info
- Links
- Social media
- Bottom links

## 📝 Customization

### Thay đổi màu sắc

Chỉnh sửa `tailwind.config.js`:

```js
theme: {
  extend: {
    colors: {
      primary: '#FF6B00',
      secondary: '#0f172a',
      accent: '#10b981',
    },
  },
}
```

### Thay đổi nội dung

Mở từng file component trong `src/components/` và chỉnh sửa nội dung

### Thêm hình ảnh

Thay thế placeholder images bằng URLs thực tế hoặc import local images

## 🤝 Contribution

Pull requests được hoan nghênh. Đối với những thay đổi lớn, vui lòng mở issue trước để thảo luận.

## 📄 License

MIT License

## 📧 Contact

Email: info@firego.vn
Phone: 1900 xxxx
