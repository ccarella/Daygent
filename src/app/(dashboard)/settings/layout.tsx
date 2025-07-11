export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-8">
      <nav className="w-64 shrink-0">
        <ul className="space-y-1">
          <li>
            <a
              href="/settings"
              className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              General
            </a>
          </li>
          <li>
            <a
              href="/settings/account"
              className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted text-muted-foreground"
            >
              Account
            </a>
          </li>
          <li>
            <a
              href="/settings/integrations"
              className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted text-muted-foreground"
            >
              Integrations
            </a>
          </li>
          <li>
            <a
              href="/settings/billing"
              className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted text-muted-foreground"
            >
              Billing
            </a>
          </li>
        </ul>
      </nav>
      <div className="flex-1">{children}</div>
    </div>
  );
}
