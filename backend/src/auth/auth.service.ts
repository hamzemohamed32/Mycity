import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compareSync } from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User } from '../users/entities/user.entity';

type AuthUserResponse = Omit<User, 'password' | 'hashPassword'>;
type AuthResponse = { user: AuthUserResponse; tokens: Record<string, string> };

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(payload: RegisterDto): Promise<AuthResponse> {
    const user = await this.usersService.create(payload);
    return {
      user: this.toAuthUserResponse(user),
      tokens: await this.issueTokens(user),
    };
  }

  async login(payload: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmailOrPhone(payload.email, payload.phone, true);

    if (!user || !compareSync(payload.password, user.password)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      user: this.toAuthUserResponse(user),
      tokens: await this.issueTokens(user),
    };
  }

  async refreshToken(refreshToken: string): Promise<Record<string, string>> {
    const payload = await this.jwtService.verifyAsync(refreshToken, {
      audience: process.env.JWT_AUDIENCE ?? 'my-city-mobile',
      issuer: process.env.JWT_ISSUER ?? 'my-city',
      secret: process.env.JWT_REFRESH_SECRET ?? 'replace-me-refresh',
    });
    const user = await this.usersService.findById(payload.sub as string);
    return this.issueTokens(user);
  }

  private async issueTokens(user: User): Promise<Record<string, string>> {
    const claims = {
      sub: user.id,
      role: user.role,
      districtId: user.districtId,
    };
    const accessTtlSeconds = 15 * 60;
    const refreshTtlSeconds = 30 * 24 * 60 * 60;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(claims, {
        audience: process.env.JWT_AUDIENCE ?? 'my-city-mobile',
        issuer: process.env.JWT_ISSUER ?? 'my-city',
        secret: process.env.JWT_ACCESS_SECRET ?? 'replace-me-access',
        expiresIn: accessTtlSeconds,
      }),
      this.jwtService.signAsync(claims, {
        audience: process.env.JWT_AUDIENCE ?? 'my-city-mobile',
        issuer: process.env.JWT_ISSUER ?? 'my-city',
        secret: process.env.JWT_REFRESH_SECRET ?? 'replace-me-refresh',
        expiresIn: refreshTtlSeconds,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private toAuthUserResponse(user: User): AuthUserResponse {
    const { password: _password, hashPassword: _hashPassword, ...safeUser } = user;
    return safeUser;
  }
}
