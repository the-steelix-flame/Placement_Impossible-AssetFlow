import { Boxes } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="grid size-11 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Boxes className="size-5" />
          </div>
          <div>
            <p className="text-xl font-semibold">AssetFlow</p>
            <p className="text-sm text-muted-foreground">Enterprise assets, one source of truth</p>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
