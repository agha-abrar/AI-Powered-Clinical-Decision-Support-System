import * as argon2 from "argon2";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { RoleName } from "@prisma/client";
jest.mock("@cdss/shared", () => ({
  PASSWORD_POLICY_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/,
  ROLE_PERMISSIONS: { PHYSICIAN: [], NURSE: [], SYSTEM_ADMIN: [] },
}));
import { AuditService } from "../../src/audit/audit.service";
import { PrismaService } from "../../src/common/prisma/prisma.service";
import { AuthService } from "../../src/auth/auth.service";

type MockPrisma = {
  role: { findUnique: jest.Mock };
  user: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
  loginAttempt: { create: jest.Mock };
};

function buildService(mockPrisma: MockPrisma, registrationEnabled = true) {
  const config = { get: jest.fn((key: string) => (key === "DEMO_ALLOW_SELF_REGISTRATION" && registrationEnabled ? "true" : undefined)) };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const jwt = { signAsync: jest.fn() };
  const service = new AuthService(
    mockPrisma as unknown as PrismaService,
    jwt as unknown as JwtService,
    config as unknown as ConfigService,
    audit as unknown as AuditService,
  );
  return { service, audit, jwt };
}

function buildPrisma(): MockPrisma {
  return {
    role: { findUnique: jest.fn() },
    user: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    loginAttempt: { create: jest.fn().mockResolvedValue(undefined) },
  };
}

const registrationInput = {
  fullName: "Dr. Casey Morgan",
  username: "casey.morgan",
  email: "casey.morgan@example.test",
  roleName: "PHYSICIAN" as RoleName,
  licenseNumber: "LIC-12345",
  password: "CarelineSecure123!",
};

describe("AuthService registration", () => {
  it("creates a pending account and requests administrator approval", async () => {
    const prisma = buildPrisma();
    prisma.role.findUnique.mockResolvedValue({ id: "role-1" });
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: "user-1" });
    const { service, audit } = buildService(prisma);

    const result = await service.register(registrationInput);

    expect(result.message).toMatch(/administrator must approve/i);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "PENDING",
        passwordChangeRequired: false,
        roles: { create: [{ roleId: "role-1" }] },
      }),
    });
    expect(prisma.user.create.mock.calls[0][0].data.passwordHash).not.toBe(registrationInput.password);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: "AUTH_REGISTRATION_REQUESTED",
      resourceId: "user-1",
    }));
  });

  it("rejects registration when the feature flag is disabled", async () => {
    const prisma = buildPrisma();
    const { service } = buildService(prisma, false);

    await expect(service.register(registrationInput)).rejects.toMatchObject({
      response: { code: "REGISTRATION_DISABLED" },
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("does not allow public requests for system administrator access", async () => {
    const prisma = buildPrisma();
    const { service } = buildService(prisma);

    await expect(service.register({ ...registrationInput, roleName: "SYSTEM_ADMIN" })).rejects.toMatchObject({
      response: { code: "VALIDATION_FAILED" },
    });
    expect(prisma.role.findUnique).not.toHaveBeenCalled();
  });

  it("does not issue a session to a pending account", async () => {
    const prisma = buildPrisma();
    prisma.user.findFirst.mockResolvedValue({
      id: "user-1",
      username: registrationInput.username,
      email: registrationInput.email,
      passwordHash: await argon2.hash(registrationInput.password),
      status: "PENDING",
      lockedUntil: null,
      mfaEnabled: false,
      roles: [{ role: { name: "PHYSICIAN" } }],
    });
    const { service, jwt } = buildService(prisma);

    await expect(service.login(registrationInput.email, registrationInput.password)).rejects.toMatchObject({
      response: { code: "ACCOUNT_PENDING" },
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });
});
