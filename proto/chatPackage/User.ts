// Original file: proto/chat.proto

import type { Status as _chatPackage_Status } from '../chatPackage/Status';

export interface User {
  'id'?: (number);
  'name'?: (string);
  'status'?: (_chatPackage_Status | keyof typeof _chatPackage_Status);
  'avatarUrl'?: (string);
}

export interface User__Output {
  'id'?: (number);
  'name'?: (string);
  'status'?: (_chatPackage_Status);
  'avatarUrl'?: (string);
}
