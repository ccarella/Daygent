import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Github,
  GitBranch,
  User,
  Bell,
  Shield,
  CreditCard,
} from "lucide-react";

interface SettingsPageProps {
  params: Promise<{ workspace: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { workspace } = await params;

  const settingsSections = [
    {
      title: "GitHub Integration",
      description: "Connect your GitHub account and manage app permissions",
      href: `/${workspace}/settings/github`,
      icon: Github,
    },
    {
      title: "Repositories",
      description: "Manage connected repositories and sync settings",
      href: `/${workspace}/settings/repositories`,
      icon: GitBranch,
    },
    {
      title: "Profile",
      description: "Update your personal information and preferences",
      href: `/${workspace}/settings/profile`,
      icon: User,
    },
    {
      title: "Notifications",
      description: "Configure how and when you receive notifications",
      href: `/${workspace}/settings/notifications`,
      icon: Bell,
    },
    {
      title: "Security",
      description: "Manage security settings and access tokens",
      href: `/${workspace}/settings/security`,
      icon: Shield,
    },
    {
      title: "Billing",
      description: "View and manage your subscription and billing details",
      href: `/${workspace}/settings/billing`,
      icon: CreditCard,
    },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and application settings
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">{section.title}</CardTitle>
                  </div>
                  <CardDescription className="text-sm">
                    {section.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
