import type { MockUser } from "../fixtures/users";

export function createMockGetUser(user: MockUser | null) {
  return async (_token: string) => user;
}

export function mockGetUserAuthorized(user: MockUser) {
  return createMockGetUser(user);
}

export function mockGetUserUnauthed() {
  return createMockGetUser(null);
}
