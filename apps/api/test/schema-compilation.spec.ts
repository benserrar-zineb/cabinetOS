import * as identitySchema from '../src/modules/identity/infrastructure/schema';
import * as organizationSchema from '../src/modules/organization/infrastructure/schema';
import * as accessControlSchema from '../src/modules/access-control/infrastructure/schema';
import * as auditSchema from '../src/modules/audit/infrastructure/schema';
import * as notificationsSchema from '../src/modules/notifications/infrastructure/schema';
import * as settingsSchema from '../src/modules/settings/infrastructure/schema';
import * as storageSchema from '../src/modules/storage/infrastructure/schema';

describe('Drizzle schema compilation', () => {
  it('loads the identity schema without error', () => {
    expect(identitySchema.users).toBeDefined();
    expect(identitySchema.sessions).toBeDefined();
    expect(identitySchema.accounts).toBeDefined();
    expect(identitySchema.verifications).toBeDefined();
  });

  it('loads the organization schema without error', () => {
    expect(organizationSchema.organizations).toBeDefined();
    expect(organizationSchema.memberships).toBeDefined();
  });

  it('loads the access-control schema without error', () => {
    expect(accessControlSchema.roles).toBeDefined();
    expect(accessControlSchema.permissions).toBeDefined();
    expect(accessControlSchema.rolePermissions).toBeDefined();
  });

  it('loads the audit schema without error', () => {
    expect(auditSchema.auditEvents).toBeDefined();
  });

  it('loads the notifications schema without error', () => {
    expect(notificationsSchema.notifications).toBeDefined();
  });

  it('loads the settings schema without error', () => {
    expect(settingsSchema.settings).toBeDefined();
  });

  it('loads the storage schema without error', () => {
    expect(storageSchema.fileObjects).toBeDefined();
  });
});
