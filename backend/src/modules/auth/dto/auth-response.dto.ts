export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    avatar?: string;
    driverTypes?: string[];
    isOnline?: boolean;
    isAvailable?: boolean;
    status?: string;
  };
}
