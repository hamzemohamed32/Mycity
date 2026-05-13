import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Complaint } from '../../complaints/entities/complaint.entity';

@Entity({ name: 'districts' })
export class District {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  code!: string | null;

  @Column({ type: 'geometry', spatialFeatureType: 'Polygon', srid: 4326, nullable: true })
  boundary!: object | null;

  @Column({ type: 'simple-array', default: '' })
  supportedCategories!: string[];

  @OneToMany(() => Complaint, (complaint) => complaint.district)
  complaints!: Complaint[];
}
