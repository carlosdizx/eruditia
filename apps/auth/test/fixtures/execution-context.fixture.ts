import { ExecutionContext } from '@nestjs/common';

// Minimal HTTP ExecutionContext for guard tests: `request` is what
// `switchToHttp().getRequest()` returns (the global AuthGuard stores the
// session on it).
const createExecutionContext = (
  request: Record<string, unknown>,
  handler: () => unknown = () => undefined,
  controller: new (...args: never[]) => unknown = class {},
): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler,
    getClass: () => controller,
  }) as unknown as ExecutionContext;

export default createExecutionContext;
