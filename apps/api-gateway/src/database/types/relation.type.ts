// Wrapper for model association property types. With emitDecoratorMetadata,
// `declare user?: UserModel` emits `design:type` = UserModel, which is
// evaluated eagerly at class definition time. Between models that import each
// other (User <-> Organization, User <-> UserPasskey, ...) that reads a class
// still in its TDZ and crashes with "Cannot access 'X' before initialization".
// A type alias has no runtime value, so the emitted metadata falls back to
// Object and the cycle is never touched at load time.
export type Relation<T> = T;
