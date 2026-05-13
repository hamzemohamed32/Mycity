import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { hashSync } from 'bcryptjs';
import { Comment } from '../../comments/entities/comment.entity';
import { Complaint } from '../../complaints/entities/complaint.entity';
import { Reaction } from '../../reactions/entities/reaction.entity';
import { UserDevice } from '../../notifications/entities/user-device.entity';

export enum UserRole {
  Citizen = 'citizen',
  DistrictAdmin = 'district_admin',
  CityAdmin = 'city_admin',
  SystemAdmin = 'system_admin',
}

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true, nullable: true })
  email!: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar' })
  fullName!: string;

  @Column({ type: 'varchar', select: false })
  password!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.Citizen,
  })
  role!: UserRole;

  @Column({ type: 'uuid', nullable: true })
  districtId!: string | null;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Complaint, (complaint) => complaint.createdBy)
  complaints!: Complaint[];

  @OneToMany(() => Comment, (comment) => comment.author)
  comments!: Comment[];

  @OneToMany(() => Reaction, (reaction) => reaction.user)
  reactions!: Reaction[];

  @OneToMany(() => UserDevice, (device) => device.user)
  devices!: UserDevice[];

  @BeforeInsert()
  @BeforeUpdate()
  hashPassword(): void {
    if (this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
      this.password = hashSync(this.password, 10);
    }
  }
}
