import { Comment } from '../comments/entities/comment.entity';
import { Complaint } from '../complaints/entities/complaint.entity';
import { District } from '../districts/entities/district.entity';
import { NotificationEvent } from '../notifications/entities/notification-event.entity';
import { UserDevice } from '../notifications/entities/user-device.entity';
import { QueueJob } from '../queue/entities/queue-job.entity';
import { Reaction } from '../reactions/entities/reaction.entity';
import { User } from '../users/entities/user.entity';

export const appEntities = [
  User,
  District,
  Complaint,
  Comment,
  Reaction,
  UserDevice,
  NotificationEvent,
  QueueJob,
];
