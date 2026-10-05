import { Umzug } from 'umzug';

export default async function runUmzugCommand<T extends object>(
  umzug: Umzug<T>,
  command: string | undefined,
): Promise<void> {
  switch (command) {
    case 'up':
      await umzug.up();
      break;
    case 'down':
      await umzug.down();
      break;
    case 'down:all':
      await umzug.down({ to: 0 });
      break;
    case 'status': {
      const [executed, pending] = await Promise.all([
        umzug.executed(),
        umzug.pending(),
      ]);
      console.log(
        'Executed:',
        executed.map((migration) => migration.name),
      );
      console.log(
        'Pending:',
        pending.map((migration) => migration.name),
      );
      break;
    }
    default:
      throw new Error(
        `Unknown command: "${command}". Use one of: up, down, down:all, status`,
      );
  }
}
