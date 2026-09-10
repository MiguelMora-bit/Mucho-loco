import { describe, it, expect } from 'vitest';
import { mapCognitoError } from './cognito-errors';

function cognitoError(name: string): Error {
  const err = new Error(name);
  err.name = name;
  return err;
}

describe('mapCognitoError', () => {
  it.each([
    ['NotAuthorizedException', 'WRONG_CREDENTIALS'],
    ['UserNotFoundException', 'WRONG_CREDENTIALS'],
    ['UserNotConfirmedException', 'NOT_CONFIRMED'],
    ['PasswordResetRequiredException', 'PASSWORD_RESET_REQUIRED'],
    ['TooManyRequestsException', 'TOO_MANY_ATTEMPTS'],
    ['LimitExceededException', 'TOO_MANY_ATTEMPTS'],
  ] as const)('maps %s to %s', (name, code) => {
    expect(mapCognitoError(cognitoError(name))).toBe(code);
  });

  it('never reveals whether the email exists — NotAuthorizedException and UserNotFoundException map identically', () => {
    expect(mapCognitoError(cognitoError('NotAuthorizedException'))).toBe(mapCognitoError(cognitoError('UserNotFoundException')));
  });

  it('falls back to UNKNOWN for an unrecognized or non-Error value', () => {
    expect(mapCognitoError(cognitoError('SomeNewExceptionAwsAddsLater'))).toBe('UNKNOWN');
    expect(mapCognitoError('not an error object')).toBe('UNKNOWN');
    expect(mapCognitoError(null)).toBe('UNKNOWN');
  });
});
