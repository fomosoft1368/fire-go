'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

const schema = z.object({
  fullName: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
  phone: z.string().regex(/^(0|\+84)[0-9]{9}$/, 'Số điện thoại không hợp lệ'),
  email: z.string().email('Email không hợp lệ'),
  city: z.string().min(1, 'Vui lòng chọn thành phố'),
  serviceType: z.string().min(1, 'Vui lòng chọn dịch vụ'),
  vehicleType: z.string().optional(),
  experience: z.string().optional(),
  message: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function PartnerForm() {
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch('/api/partner/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        setSubmitStatus('success')
        reset()
      } else {
        setSubmitStatus('error')
      }
    } catch {
      setSubmitStatus('error')
    }
  }

  if (submitStatus === 'success') {
    return (
      <div className="bg-green-50 rounded-3xl p-10 text-center border border-green-200">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-800 text-slate-900 mb-2">Đăng ký thành công!</h3>
        <p className="text-slate-600">
          Chúng tôi đã nhận được thông tin của bạn. Đội ngũ FireGo sẽ liên hệ trong vòng 24–48 giờ làm việc.
        </p>
        <button onClick={() => setSubmitStatus('idle')} className="btn-primary mt-6">
          Đăng ký thêm
        </button>
      </div>
    )
  }

  const inputClass = (hasError: boolean) =>
    `w-full px-4 py-3 rounded-xl border text-sm text-slate-800 outline-none transition-all focus:border-orange-400 focus:ring-2 focus:ring-orange-100 ${hasError ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white hover:border-orange-200'
    }`

  const labelClass = 'block text-sm font-600 text-slate-700 mb-1.5'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {submitStatus === 'error' && (
        <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl border border-red-200 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          Có lỗi xảy ra. Vui lòng thử lại hoặc liên hệ trực tiếp 09222.33.666.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Họ và tên *</label>
          <input {...register('fullName')} placeholder="Nguyễn Văn A" className={inputClass(!!errors.fullName)} />
          {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>}
        </div>
        <div>
          <label className={labelClass}>Số điện thoại *</label>
          <input {...register('phone')} placeholder="0901234567" type="tel" className={inputClass(!!errors.phone)} />
          {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
        </div>
      </div>

      <div>
        <label className={labelClass}>Email *</label>
        <input {...register('email')} placeholder="email@example.com" type="email" className={inputClass(!!errors.email)} />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Thành phố *</label>
          <select {...register('city')} className={inputClass(!!errors.city)}>
            <option value="">Chọn thành phố</option>
            <option value="vinh">Vinh, Nghệ An</option>
            <option value="hcm">TP. Hồ Chí Minh</option>
            <option value="hn">Hà Nội</option>
            <option value="da-nang">Đà Nẵng</option>
            <option value="other">Tỉnh / Thành phố khác</option>
          </select>
          {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city.message}</p>}
        </div>
        <div>
          <label className={labelClass}>Loại dịch vụ *</label>
          <select {...register('serviceType')} className={inputClass(!!errors.serviceType)}>
            <option value="">Chọn dịch vụ</option>
            <option value="ghep-xe">🚗 Ghép Xe</option>
            <option value="lai-ho">🧑‍✈️ Lái Hộ</option>
            <option value="van-chuyen">📦 Vận Chuyển</option>
            <option value="ve-sinh">🧹 Vệ Sinh</option>
          </select>
          {errors.serviceType && <p className="text-xs text-red-500 mt-1">{errors.serviceType.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Loại phương tiện</label>
          <select {...register('vehicleType')} className={inputClass(false)}>
            <option value="">Không áp dụng</option>
            <option value="xe-may">Xe máy</option>
            <option value="sedan">Ô tô Sedan (4-5 chỗ)</option>
            <option value="suv">SUV/MPV (7 chỗ)</option>
            <option value="minivan">Minivan</option>
            <option value="pickup">Xe bán tải/Pickup</option>
            <option value="tai-nho">Xe tải nhỏ (≤1 tấn)</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Kinh nghiệm</label>
          <select {...register('experience')} className={inputClass(false)}>
            <option value="">Chọn kinh nghiệm</option>
            <option value="under1">Dưới 1 năm</option>
            <option value="1to3">1–3 năm</option>
            <option value="3to5">3–5 năm</option>
            <option value="over5">Trên 5 năm</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Lời nhắn (không bắt buộc)</label>
        <textarea
          {...register('message')}
          rows={3}
          placeholder="Thông tin bổ sung về bạn..."
          className={inputClass(false) + ' resize-none'}
        />
      </div>

      <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center text-base py-4">
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Đang gửi...
          </>
        ) : (
          '🚀 Gửi đăng ký ngay'
        )}
      </button>
      <p className="text-xs text-slate-400 text-center">
        Bằng cách gửi form, bạn đồng ý với{' '}
        <a href="#" className="text-orange-500 hover:underline">điều khoản sử dụng</a> của FireGo.
      </p>
    </form>
  )
}
