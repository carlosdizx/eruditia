// Register every table here (never example.schema.ts / other table files
// directly). Consumed by drizzle-kit (schema diffing, see drizzle.config.ts)
// and by DatabaseModule for the Nest `db` instance. If a table isn't
// exported here, drizzle-kit doesn't know about it and no migration is
// generated for it.
//
// Empty for now — see example.schema.ts for the reference pattern to follow
// when adding the first real table:
//
// export * from './example.schema';
export {};
