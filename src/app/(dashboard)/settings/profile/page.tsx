import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfileForm } from "@/features/auth/components/profile-form";
import { requireCurrentUser } from "@/features/auth/queries";
import { FileManager } from "@/features/files/components/file-manager";
import { listFiles } from "@/features/files/queries";

export const metadata: Metadata = { title: "Profile settings" };

export default async function ProfileSettingsPage() {
  const [user, files] = await Promise.all([requireCurrentUser(), listFiles()]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-7 p-5 sm:p-7 lg:p-10">
      <PageHeader
        eyebrow="Settings"
        title="Profile"
        description="Manage your display name and personal workspace attachments."
      />

      <Card role="region" aria-labelledby="profile-details-title">
        <CardHeader>
          <CardTitle id="profile-details-title" className="text-base">
            Personal details
          </CardTitle>
          <CardDescription>
            Used in the application shell and audit records.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <ProfileForm user={user} />
        </CardContent>
      </Card>

      <Card role="region" aria-labelledby="attachments-title">
        <CardHeader>
          <CardTitle id="attachments-title" className="text-base">
            Attachments
          </CardTitle>
          <CardDescription>
            Private files scoped to your account by Storage RLS.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <FileManager files={files} />
        </CardContent>
      </Card>
    </div>
  );
}
