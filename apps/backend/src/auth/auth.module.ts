import { Module } from '@nestjs/common';
import { CognitoVerifierService } from './cognito-verifier.service';

@Module({
  providers: [CognitoVerifierService],
  exports: [CognitoVerifierService],
})
export class AuthModule {}
