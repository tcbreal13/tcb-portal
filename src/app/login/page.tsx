import { Brand } from "@/components/Brand";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="wrap">
      <div className="top"><Brand /></div>
      <LoginForm next={next && next.startsWith("/") ? next : "/"} />
    </div>
  );
}
