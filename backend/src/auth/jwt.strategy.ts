import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience: process.env.JWT_AUDIENCE ?? 'my-city-mobile',
      issuer: process.env.JWT_ISSUER ?? 'my-city',
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? 'replace-me-access',
    });
  }

  validate(payload: Record<string, unknown>): Record<string, unknown> {
    return payload;
  }
}

