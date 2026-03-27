import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import PartnerRegistration from '@/lib/models/PartnerRegistration'
import { z } from 'zod'

const schema = z.object({
  fullName: z.string().min(2),
  phone: z.string().regex(/^(0|\+84)[0-9]{9}$/),
  email: z.string().email(),
  city: z.string().min(1),
  serviceType: z.enum(['ghep-xe', 'lai-ho', 'van-chuyen', 've-sinh']),
  vehicleType: z.string().optional(),
  experience: z.string().optional(),
  message: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = schema.parse(body)

    await connectToDatabase()

    const registration = await PartnerRegistration.create(data)

    // Notify via Telegram
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN || '6268223269:AAGx7ThMOnlhTocipvrYsISbLmo-I2Oggl4'
    const telegramChatId = process.env.TELEGRAM_CHAT_ID || '-1003851019805'
    const telegramMessage = `
🚀 <b>CÓ ĐỐI TÁC MỚI ĐĂNG KÝ</b>
👤 <b>Tên:</b> ${data.fullName}
📞 <b>SĐT:</b> <code>${data.phone}</code>
📧 <b>Email:</b> ${data.email}
📍 <b>Khu vực:</b> ${data.city === 'vinh' ? 'Vinh, Nghệ An' : data.city === 'hcm' ? 'TP. Hồ Chí Minh' : data.city === 'hn' ? 'Hà Nội' : data.city === 'da-nang' ? 'Đà Nẵng' : 'Khác'}
💼 <b>Dịch vụ:</b> ${data.serviceType === 'ghep-xe' ? '🚗 Ghép Xe' : data.serviceType === 'lai-ho' ? '🧑‍✈️ Lái Hộ' : data.serviceType === 'van-chuyen' ? '📦 Vận Chuyển' : '🧹 Vệ Sinh'}
🚙 <b>Phương tiện:</b> ${data.vehicleType || 'Không'}
⭐ <b>Kinh nghiệm:</b> ${data.experience || 'Không rõ'}
💬 <b>Lời nhắn:</b> <i>${data.message || 'Không có'}</i>
`
    try {
      await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: telegramMessage,
          parse_mode: 'HTML',
        }),
      })
    } catch (e) {
      console.error('Lỗi gửi Telegram:', e)
    }

    return NextResponse.json({
      success: true,
      message: 'Đăng ký thành công! Chúng tôi sẽ liên hệ trong 24–48 giờ.',
      id: registration._id,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu không hợp lệ', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Partner registration error:', error)
    return NextResponse.json(
      { success: false, error: 'Lỗi hệ thống, vui lòng thử lại' },
      { status: 500 }
    )
  }
}
