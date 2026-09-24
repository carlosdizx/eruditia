// Register every table here. Consumed by drizzle-kit (schema diffing, see
// drizzle.config.ts) and by DatabaseModule for the Nest `db` instance. If a
// table isn't exported here, drizzle-kit doesn't know about it and no
// migration is generated for it.

export * from './auth.schema';
export * from './organization.schema';
