import { RegisterDto } from '../../auth/dto/register.dto';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto extends RegisterDto {
  role?: UserRole;
  districtId?: string | null;
}
