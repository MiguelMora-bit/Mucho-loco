import { describe, expect, it } from 'vitest';
import { cognitoErrorCode } from './cognito-errors';

describe('cognitoErrorCode', () => {
  it.each([
    ['UsernameExistsException', 'USER_EXISTS'],
    ['InvalidPasswordException', 'INVALID_PASSWORD'],
    ['UserNotConfirmedException', 'NOT_CONFIRMED'],
    ['NotAuthorizedException', 'WRONG_CREDENTIALS'],
    ['UserNotFoundException', 'WRONG_CREDENTIALS'],
    ['CodeMismatchException', 'CODE_MISMATCH'],
    ['ExpiredCodeException', 'CODE_EXPIRED'],
    ['LimitExceededException', 'TOO_MANY_ATTEMPTS'],
    ['TooManyRequestsException', 'TOO_MANY_ATTEMPTS'],
    ['TooManyFailedAttemptsException', 'TOO_MANY_ATTEMPTS'],
  ] as const)('maps %s to %s', (name, code) => {
    expect(cognitoErrorCode(name)).toBe(code);
  });

  it('understands the namespaced __type of the JSON API', () => {
    expect(cognitoErrorCode('com.amazonaws.cognito.identity.idp.model#NotAuthorizedException')).toBe(
      'WRONG_CREDENTIALS',
    );
  });

  it('never reveals whether the email exists', () => {
    expect(cognitoErrorCode('UserNotFoundException')).toBe(cognitoErrorCode('NotAuthorizedException'));
  });

  it('falls back to UNKNOWN for anything new or empty', () => {
    expect(cognitoErrorCode('SomeNewExceptionAwsAddsLater')).toBe('UNKNOWN');
    expect(cognitoErrorCode('')).toBe('UNKNOWN');
  });
});
