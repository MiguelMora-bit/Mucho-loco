import { describe, it, expect } from 'vitest';
import { mapCognitoError } from './cognito-errors';

function cognitoError(name: string): Error {
  const err = new Error(name);
  err.name = name;
  return err;
}

describe('mapCognitoError', () => {
  it.each([
    ['UsernameExistsException', 'USER_EXISTS', 409],
    ['InvalidPasswordException', 'INVALID_PASSWORD', 400],
    ['UserNotConfirmedException', 'NOT_CONFIRMED', 403],
    ['NotAuthorizedException', 'WRONG_CREDENTIALS', 401],
    ['UserNotFoundException', 'WRONG_CREDENTIALS', 401],
    ['CodeMismatchException', 'CODE_MISMATCH', 400],
    ['ExpiredCodeException', 'CODE_EXPIRED', 400],
    ['LimitExceededException', 'TOO_MANY_ATTEMPTS', 429],
    ['TooManyRequestsException', 'TOO_MANY_ATTEMPTS', 429],
    ['TooManyFailedAttemptsException', 'TOO_MANY_ATTEMPTS', 429],
  ] as const)('maps %s to %s (%i)', (name, code, status) => {
    expect(mapCognitoError(cognitoError(name))).toEqual({ code, status });
  });

  it('never reveals whether the email exists — NotAuthorizedException and UserNotFoundException map identically', () => {
    expect(mapCognitoError(cognitoError('NotAuthorizedException'))).toEqual(mapCognitoError(cognitoError('UserNotFoundException')));
  });

  it('falls back to UNKNOWN/500 for an unrecognized or non-Error value', () => {
    expect(mapCognitoError(cognitoError('SomeNewExceptionAwsAddsLater'))).toEqual({ code: 'UNKNOWN', status: 500 });
    expect(mapCognitoError('not an error object')).toEqual({ code: 'UNKNOWN', status: 500 });
    expect(mapCognitoError(null)).toEqual({ code: 'UNKNOWN', status: 500 });
  });
});
