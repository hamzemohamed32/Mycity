import dataSource from './data-source';
import { District } from '../districts/entities/district.entity';
import { Complaint, ComplaintCategory, ComplaintStatus } from '../complaints/entities/complaint.entity';
import { User, UserRole } from '../users/entities/user.entity';

async function seed(): Promise<void> {
  await dataSource.initialize();

  const userRepository = dataSource.getRepository(User);
  const districtRepository = dataSource.getRepository(District);
  const complaintRepository = dataSource.getRepository(Complaint);

  const centralDistrict = await ensureDistrict(districtRepository, {
    name: 'Central District',
    code: 'CD-01',
    supportedCategories: ['water', 'roads', 'lighting', 'waste'],
  });

  await dataSource.query(
    `UPDATE "districts"
      SET "boundary" = ST_GeomFromText($1, 4326)
      WHERE "id" = $2`,
    ['POLYGON((36.80 -1.30, 36.84 -1.30, 36.84 -1.26, 36.80 -1.26, 36.80 -1.30))', centralDistrict.id],
  );

  const citizen = await ensureUser(userRepository, {
    fullName: 'Citizen Demo',
    email: 'citizen@mycity.local',
    password: 'Password123!',
    role: UserRole.Citizen,
    districtId: centralDistrict.id,
  });

  const admin = await ensureUser(userRepository, {
    fullName: 'District Admin Demo',
    email: 'admin@mycity.local',
    password: 'Password123!',
    role: UserRole.DistrictAdmin,
    districtId: centralDistrict.id,
  });

  await ensureUser(userRepository, {
    fullName: 'Mayor Demo',
    email: 'mayor@mycity.local',
    password: 'Password123!',
    role: UserRole.CityAdmin,
    districtId: null,
  });

  await ensureComplaint(complaintRepository, {
    description: 'Water leak near the school entrance',
    category: ComplaintCategory.Water,
    status: ComplaintStatus.Pending,
    districtId: centralDistrict.id,
    createdById: citizen.id,
    assignedAdminId: admin.id,
    clientRequestId: 'seed-water-1',
    location: {
      type: 'Point',
      coordinates: [36.817223, -1.286389],
    },
  });

  await ensureComplaint(complaintRepository, {
    description: 'Street light out on the main avenue',
    category: ComplaintCategory.Lighting,
    status: ComplaintStatus.InProgress,
    districtId: centralDistrict.id,
    createdById: citizen.id,
    assignedAdminId: admin.id,
    clientRequestId: 'seed-light-1',
    supportCount: 5,
    location: {
      type: 'Point',
      coordinates: [36.8205, -1.2831],
    },
  });

  await dataSource.destroy();
}

async function ensureDistrict(
  repository: ReturnType<typeof dataSource.getRepository<District>>,
  payload: Pick<District, 'name' | 'code' | 'supportedCategories'>,
): Promise<District> {
  const existing = await repository.findOne({ where: { name: payload.name } });
  if (existing) {
    existing.code = payload.code;
    existing.supportedCategories = payload.supportedCategories;
    return repository.save(existing);
  }

  return repository.save(repository.create(payload));
}

async function ensureUser(
  repository: ReturnType<typeof dataSource.getRepository<User>>,
  payload: Pick<User, 'fullName' | 'email' | 'password' | 'role' | 'districtId'>,
): Promise<User> {
  if (!payload.email) {
    throw new Error('Seed users require an email');
  }

  const existing = await repository.findOne({
    where: { email: payload.email },
  });
  if (existing) {
    existing.fullName = payload.fullName;
    existing.role = payload.role;
    existing.districtId = payload.districtId;
    existing.password = payload.password;
    return repository.save(existing);
  }

  return repository.save(repository.create(payload));
}

async function ensureComplaint(
  repository: ReturnType<typeof dataSource.getRepository<Complaint>>,
  payload: Partial<Complaint> & Pick<Complaint, 'description' | 'category' | 'createdById' | 'location'>,
): Promise<Complaint> {
  const existing =
    payload.clientRequestId == null
      ? null
      : await repository.findOne({
          where: {
            createdById: payload.createdById,
            clientRequestId: payload.clientRequestId,
          },
        });

  if (existing) {
    existing.description = payload.description;
    existing.category = payload.category;
    existing.status = payload.status ?? ComplaintStatus.Pending;
    existing.districtId = payload.districtId ?? null;
    existing.assignedAdminId = payload.assignedAdminId ?? null;
    existing.location = payload.location;
    existing.supportCount = payload.supportCount ?? existing.supportCount;
    return repository.save(existing);
  }

  return repository.save(
    repository.create({
      ...payload,
      status: payload.status ?? ComplaintStatus.Pending,
      supportCount: payload.supportCount ?? 0,
    }),
  );
}

seed()
  .then(() => {
    console.log('Seed completed');
  })
  .catch(async (error) => {
    console.error(error);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  });
