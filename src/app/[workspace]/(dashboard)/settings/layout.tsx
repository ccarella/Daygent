"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const workspaceSlug = params.workspace as string;

  return (
    <div className="flex gap-8">
      <nav className="w-64 shrink-0">
        <ul className="space-y-1">
          <li>
            <Link
              href={`/${workspaceSlug}/settings`}
              className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              General
            </Link>
          </li>
          <li>
            <Link
              href={`/${workspaceSlug}/settings/repositories`}
              className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted text-muted-foreground"
            >
              Repositories
            </Link>
          </li>
          <li>
            <Link
              href={`/${workspaceSlug}/settings/integrations`}
              className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted text-muted-foreground"
            >
              Integrations
            </Link>
          </li>
          <li>
            <Link
              href={`/${workspaceSlug}/settings/account`}
              className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted text-muted-foreground"
            >
              Account
            </Link>
          </li>
          <li>
            <Link
              href={`/${workspaceSlug}/settings/billing`}
              className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted text-muted-foreground"
            >
              Billing
            </Link>
          </li>
        </ul>
      </nav>
      <div className="flex-1">{children}</div>
    </div>
  );
}
