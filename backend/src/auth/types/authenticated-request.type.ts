import { Request } from 'express';
import { JwtPayload } from '../strategies/jwt.strategy';

export type AuthenticatedRequest = Request & {
  user: JwtPayload;
};
