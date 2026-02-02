import { useState, useEffect } from 'react'
import { pricingService, PricingConfig as PricingConfigType, PeakHour, CarpoolDiscount, VehicleTypePrice } from '../services/pricingService'
import Layout from '../components/Layout'

export default function PricingConfigPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState('sedan')
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypePrice[]>([
    { type: 'sedan', name: 'Sedan (4-5 chỗ)', baseFee: 20000, pricePerKm: 8000, minimumFare: 30000 },
    { type: 'suv', name: 'SUV (7 chỗ)', baseFee: 25000, pricePerKm: 10000, minimumFare: 40000 },
    { type: 'truck', name: 'Truck (Bán tải)', baseFee: 30000, pricePerKm: 12000, minimumFare: 50000 }
  ])
  const [peakMultiplier, setPeakMultiplier] = useState(1.2)
  const [driverShare, setDriverShare] = useState(85)
  const [maxDiscountRate, setMaxDiscountRate] = useState(30)
  const [carpoolDiscounts, setCarpoolDiscounts] = useState<CarpoolDiscount[]>([
    { passengers: 1, discount: 0 },
    { passengers: 2, discount: 15 },
    { passengers: 3, discount: 25 },
    { passengers: 4, discount: 30 }
  ])
  const [peakHours, setPeakHours] = useState<PeakHour[]>([])
  const [simulation, setSimulation] = useState('')

  // Load config from API
  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const config = await pricingService.getConfig()
      
      // Đảm bảo luôn có vehicleTypes
      const defaultVehicles = [
        { type: 'sedan', name: 'Sedan (4-5 chỗ)', baseFee: 20000, pricePerKm: 8000, minimumFare: 30000 },
        { type: 'suv', name: 'SUV (7 chỗ)', baseFee: 25000, pricePerKm: 10000, minimumFare: 40000 },
        { type: 'truck', name: 'Truck (Bán tải)', baseFee: 30000, pricePerKm: 12000, minimumFare: 50000 }
      ]
      
      setVehicleTypes(config.vehicleTypes && config.vehicleTypes.length > 0 ? config.vehicleTypes : defaultVehicles)
      setPeakMultiplier(config.peakMultiplier || 1.2)
      setDriverShare(config.driverShare || 85)
      setMaxDiscountRate(config.maxDiscountRate || 30)
      setCarpoolDiscounts(config.carpoolDiscounts && config.carpoolDiscounts.length > 0 ? config.carpoolDiscounts : [
        { passengers: 1, discount: 0 },
        { passengers: 2, discount: 15 },
        { passengers: 3, discount: 25 },
        { passengers: 4, discount: 30 }
      ])
      setPeakHours(config.peakHours || [])
    } catch (error) {
      console.error('Failed to load pricing config:', error)
      alert('❌ Không thể tải cấu hình. Sử dụng giá trị mặc định.')
    } finally {
      setLoading(false)
    }
  }

  // Update simulation whenever values change
  useEffect(() => {
    updateSimulation()
  }, [vehicleTypes, selectedVehicle, carpoolDiscounts])

  const updateSimulation = () => {
    const distance = 10
    const passengers = 2
    const vehicle = vehicleTypes.find(v => v.type === selectedVehicle)
    if (!vehicle) return
    
    const basePrice = vehicle.baseFee + (vehicle.pricePerKm * distance)
    
    const discount2Pass = carpoolDiscounts.find(d => d.passengers === 2)
    const discountedPrice = discount2Pass 
      ? basePrice * (1 - discount2Pass.discount / 100)
      : basePrice
    
    setSimulation(
      `Loại xe ${vehicle.name}: Cuốc xe ${distance}km cho ${passengers} người ghép sẽ có giá xấp xỉ ${Math.round(discountedPrice).toLocaleString('vi-VN')} VND.`
    )
  }

  const updateVehicleType = (type: string, field: keyof VehicleTypePrice, value: any) => {
    setVehicleTypes(prev => prev.map(v => 
      v.type === type ? { ...v, [field]: value } : v
    ))
  }

  const addPeakHour = () => {
    const newId = Date.now().toString()
    setPeakHours([
      ...peakHours,
      {
        id: newId,
        name: 'Giờ cao điểm mới',
        startTime: '00:00',
        endTime: '01:00',
        multiplier: 1.2
      }
    ])
  }

  const addCarpoolDiscount = () => {
    // Tìm số người lớn nhất hiện tại
    const maxPassengers = Math.max(...carpoolDiscounts.map(d => d.passengers), 0)
    const newPassengers = maxPassengers + 1
    
    setCarpoolDiscounts([
      ...carpoolDiscounts,
      { passengers: newPassengers, discount: 0 }
    ])
  }

  const deleteCarpoolDiscount = (passengers: number) => {
    if (window.confirm(`Bạn có chắc muốn xóa giảm giá cho ${passengers} người?`)) {
      setCarpoolDiscounts(carpoolDiscounts.filter(d => d.passengers !== passengers))
    }
  }

  const updatePeakHour = (id: string, updates: Partial<PeakHour>) => {
    setPeakHours(peakHours.map(hour => 
      hour.id === id ? { ...hour, ...updates } : hour
    ))
  }

  const deletePeakHour = (id: string) => {
    if (window.confirm('Bạn có chắc muốn xóa khung giờ này?')) {
      setPeakHours(peakHours.filter(hour => hour.id !== id))
    }
  }

  const updateCarpoolDiscount = (passengers: number, discount: number) => {
    setCarpoolDiscounts(prev => {
      const existing = prev.find(d => d.passengers === passengers)
      if (existing) {
        return prev.map(d => d.passengers === passengers ? { ...d, discount } : d)
      } else {
        return [...prev, { passengers, discount }]
      }
    })
  }

  const saveConfiguration = async () => {
    const config: Partial<PricingConfigType> = {
      vehicleTypes,
      peakMultiplier,
      driverShare,
      maxDiscountRate,
      carpoolDiscounts,
      peakHours
    }

    try {
      setSaving(true)
      await pricingService.updateConfig(config)
      alert('✅ Lưu cấu hình thành công!')
    } catch (error) {
      console.error('Failed to save config:', error)
      alert('❌ Lỗi khi lưu cấu hình!')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-300">Đang tải cấu hình...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Cấu hình Công thức Tính giá
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Thiết lập các tham số cơ bản cho hệ thống cước phí
          </p>
        </div>

        {/* Basic Parameters */}
        <div className="bg-white dark:bg-card-dark rounded-lg border border-slate-200 dark:border-slate-800 p-6 mb-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            Tham số chung
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <label className="flex flex-col">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Hệ số cao điểm
              </span>
              <input
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                type="number"
                step="0.1"
                value={peakMultiplier}
                onChange={(e) => setPeakMultiplier(parseFloat(e.target.value) || 0)}
              />
            </label>

            <label className="flex flex-col">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Tỷ lệ tài xế (%)
              </span>
              <input
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                type="number"
                value={driverShare}
                onChange={(e) => setDriverShare(parseFloat(e.target.value) || 0)}
              />
            </label>

            <label className="flex flex-col">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Tỷ lệ giảm tối đa (%)
              </span>
              <input
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                type="number"
                value={maxDiscountRate}
                onChange={(e) => setMaxDiscountRate(parseFloat(e.target.value) || 0)}
              />
            </label>
          </div>
        </div>

        {/* Vehicle Type Pricing */}
        <div className="bg-white dark:bg-card-dark rounded-lg border border-slate-200 dark:border-slate-800 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Giá theo loại xe
            </h3>
            <div className="flex gap-2">
              {vehicleTypes.map(vehicle => (
                <button
                  key={vehicle.type}
                  onClick={() => setSelectedVehicle(vehicle.type)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedVehicle === vehicle.type
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {vehicle.name}
                </button>
              ))}
            </div>
          </div>

          {vehicleTypes.map(vehicle => vehicle.type === selectedVehicle && (
            <div key={vehicle.type} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex flex-col">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Phí mở cuốc (VND)
                </span>
                <input
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  type="number"
                  value={vehicle.baseFee}
                  onChange={(e) => updateVehicleType(vehicle.type, 'baseFee', parseFloat(e.target.value) || 0)}
                />
              </label>

              <label className="flex flex-col">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Giá mỗi km (VND)
                </span>
                <input
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  type="number"
                  value={vehicle.pricePerKm}
                  onChange={(e) => updateVehicleType(vehicle.type, 'pricePerKm', parseFloat(e.target.value) || 0)}
                />
              </label>

              <label className="flex flex-col">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Giá tối thiểu (VND)
                </span>
                <input
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  type="number"
                  value={vehicle.minimumFare}
                  onChange={(e) => updateVehicleType(vehicle.type, 'minimumFare', parseFloat(e.target.value) || 0)}
                />
              </label>
            </div>
          ))}
        </div>

        {/* Carpool Discounts */}
        <div className="bg-white dark:bg-card-dark rounded-lg border border-slate-200 dark:border-slate-800 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Tỷ lệ giảm giá ghép xe
            </h3>
            <button
              onClick={addCarpoolDiscount}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              Thêm người
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                    Số người
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                    Giảm giá (%)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {carpoolDiscounts.sort((a, b) => a.passengers - b.passengers).map(discount => (
                  <tr key={discount.passengers}>
                    <td className="px-4 py-4 text-slate-900 dark:text-white font-medium">
                      {discount.passengers} Người
                    </td>
                    <td className="px-4 py-2">
                      <input
                        className="w-24 px-2 py-1 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        type="number"
                        value={discount.discount}
                        onChange={(e) => updateCarpoolDiscount(discount.passengers, parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => deleteCarpoolDiscount(discount.passengers)}
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Peak Hours */}
        <div className="bg-white dark:bg-card-dark rounded-lg border border-slate-200 dark:border-slate-800 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Khung giờ cao điểm
            </h3>
            <button
              onClick={addPeakHour}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              Thêm giờ
            </button>
          </div>

          <div className="space-y-4">
            {peakHours.map(hour => (
              <div
                key={hour.id}
                className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <label className="flex flex-col">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Tên khung giờ
                      </span>
                      <input
                        className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                        type="text"
                        value={hour.name}
                        onChange={(e) => updatePeakHour(hour.id, { name: e.target.value })}
                      />
                    </label>
                    
                    <label className="flex flex-col">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Bắt đầu
                      </span>
                      <input
                        className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                        type="time"
                        value={hour.startTime}
                        onChange={(e) => updatePeakHour(hour.id, { startTime: e.target.value })}
                      />
                    </label>
                    
                    <label className="flex flex-col">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Kết thúc
                      </span>
                      <input
                        className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                        type="time"
                        value={hour.endTime}
                        onChange={(e) => updatePeakHour(hour.id, { endTime: e.target.value })}
                      />
                    </label>
                    
                    <label className="flex flex-col">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Hệ số
                      </span>
                      <input
                        className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                        type="number"
                        step="0.1"
                        value={hour.multiplier}
                        onChange={(e) => updatePeakHour(hour.id, { multiplier: parseFloat(e.target.value) || 1 })}
                      />
                    </label>
                  </div>
                  
                  <button
                    onClick={() => deletePeakHour(hour.id)}
                    className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded transition-colors"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            ))}
            
            {peakHours.length === 0 && (
              <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                Chưa có khung giờ cao điểm nào. Nhấn "Thêm giờ" để tạo mới.
              </p>
            )}
          </div>
        </div>

        {/* Simulation */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6 flex items-start gap-3">
          <span className="material-symbols-outlined text-primary mt-0.5">info</span>
          <div>
            <p className="text-sm font-semibold text-primary mb-1">Mô phỏng nhanh</p>
            <p className="text-sm text-primary/80">{simulation}</p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <button
            onClick={async () => {
              if (window.confirm('⚠️ Bạn có chắc muốn khôi phục cấu hình mặc định? Tất cả thay đổi hiện tại sẽ bị xóa.')) {
                try {
                  setSaving(true)
                  await pricingService.resetToDefaults()
                  alert('✅ Đã khôi phục cấu hình mặc định!')
                  await loadConfig()
                } catch (error) {
                  console.error('Failed to reset config:', error)
                  alert('❌ Lỗi khi khôi phục cấu hình!')
                } finally {
                  setSaving(false)
                }
              }
            }}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-slate-500 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">restart_alt</span>
            Khôi phục mặc định
          </button>
          
          <button
            onClick={saveConfiguration}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Đang lưu...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">save</span>
                Lưu cấu hình
              </>
            )}
          </button>
        </div>
      </div>
    </Layout>
  )
}
