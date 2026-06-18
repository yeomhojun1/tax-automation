import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { User } from './entities/user.entity';

const BCRYPT_ROUNDS = 12;

export interface AuthTokenPayload {
  sub: number;
  email: string;
}

export interface AuthResult {
  accessToken: string;
  user: Omit<User, 'password'>;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('이미 사용 중인 이메일입니다');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = this.userRepository.create({
      ...dto,
      password: hashedPassword,
      isGeneralTaxpayer: dto.isGeneralTaxpayer ?? true,
      businessNumber: dto.businessNumber ?? null,
    });

    const saved = await this.userRepository.save(user);
    return this.buildAuthResult(saved);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.userRepository.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다');
    }

    return this.buildAuthResult(user);
  }

  async getMe(userId: number): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }
    const { password: _password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateMe(userId: number, dto: UpdateProfileDto): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }
    Object.assign(user, dto);
    const saved = await this.userRepository.save(user);
    const { password: _password, ...userWithoutPassword } = saved;
    return userWithoutPassword;
  }

  async changePassword(userId: number, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }
    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) {
      throw new UnauthorizedException('현재 비밀번호가 올바르지 않습니다');
    }
    user.password = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.userRepository.save(user);
  }

  async validateUser(payload: AuthTokenPayload): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다');
    }
    return user;
  }

  private buildAuthResult(user: User): AuthResult {
    const payload: AuthTokenPayload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    const { password: _password, ...userWithoutPassword } = user;
    return { accessToken, user: userWithoutPassword };
  }
}
