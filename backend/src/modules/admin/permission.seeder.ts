import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission, PermissionDocument } from './schemas/permission.schema';

@Injectable()
export class PermissionSeeder {
  constructor(
    @InjectModel(Permission.name)
    private permissionModel: Model<PermissionDocument>,
  ) {}

  async seedPermissions() {
    const permissions = [
      // Dispatch Management
      {
        id: 'view_dispatch',
        name: 'Xem điều phối',
        description: 'Xem danh sách cuốc xe',
        category: 'Điều phối',
      },
      {
        id: 'manage_dispatch',
        name: 'Quản lý điều phối',
        description: 'Chỉnh sửa thông tin cuốc xe',
        category: 'Điều phối',
      },
      {
        id: 'resolve_disputes',
        name: 'Xử lý tranh chấp',
        description: 'Xử lý yêu cầu tranh chấp',
        category: 'Điều phối',
      },

      // Driver Management
      {
        id: 'view_drivers',
        name: 'Xem tài xế',
        description: 'Xem danh sách tài xế',
        category: 'Tài xế',
      },
      {
        id: 'approve_drivers',
        name: 'Duyệt tài xế',
        description: 'Duyệt/từ chối tài xế mới',
        category: 'Tài xế',
      },
      {
        id: 'suspend_drivers',
        name: 'Tạm khóa tài xế',
        description: 'Tạm khóa tài xế',
        category: 'Tài xế',
      },
      {
        id: 'manage_drivers',
        name: 'Quản lý tài xế',
        description: 'Sửa xóa thông tin tài xế',
        category: 'Tài xế',
      },

      // Customer Management
      {
        id: 'view_customers',
        name: 'Xem khách hàng',
        description: 'Xem danh sách khách hàng',
        category: 'Khách hàng',
      },
      {
        id: 'block_customers',
        name: 'Khóa khách hàng',
        description: 'Khóa tài khoản khách hàng',
        category: 'Khách hàng',
      },
      {
        id: 'manage_customers',
        name: 'Quản lý khách hàng',
        description: 'Sửa xóa thông tin khách hàng',
        category: 'Khách hàng',
      },

      // Financial
      {
        id: 'view_revenue',
        name: 'Xem doanh thu',
        description: 'Xem báo cáo doanh thu',
        category: 'Tài chính',
      },
      {
        id: 'manage_payments',
        name: 'Quản lý thanh toán',
        description: 'Xử lý hoàn tiền, thanh toán',
        category: 'Tài chính',
      },
      {
        id: 'view_wallets',
        name: 'Xem ví',
        description: 'Xem ví khách hàng và tài xế',
        category: 'Tài chính',
      },

      // System
      {
        id: 'manage_users',
        name: 'Quản lý người dùng',
        description: 'Thêm/sửa/xóa người dùng',
        category: 'Hệ thống',
      },
      {
        id: 'manage_permissions',
        name: 'Quản lý quyền',
        description: 'Thay đổi quyền người dùng',
        category: 'Hệ thống',
      },
      {
        id: 'view_logs',
        name: 'Xem nhật ký',
        description: 'Xem nhật ký hoạt động',
        category: 'Hệ thống',
      },
      {
        id: 'manage_settings',
        name: 'Quản lý cài đặt',
        description: 'Cấu hình hệ thống',
        category: 'Hệ thống',
      },
    ];

    for (const permission of permissions) {
      await this.permissionModel.findOneAndUpdate(
        { id: permission.id },
        permission,
        { upsert: true, new: true },
      );
    }

    console.log('✅ Permissions seeded successfully');
  }
}
