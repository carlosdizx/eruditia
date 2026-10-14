import { LogoutButton } from '@/components/auth/logout-button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Eruditia</CardTitle>
          <CardDescription>
            Frontend configurado. Pronto conectaremos con la API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LogoutButton variant="outline" className="w-full" />
        </CardContent>
      </Card>
    </main>
  );
}
