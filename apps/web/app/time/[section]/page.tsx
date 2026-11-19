import { notFound } from "next/navigation";
import { TimeWorkspace } from "../../../components/time-workspace";
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (section !== "leave" && section !== "attendance" && section !== "calendar")
    notFound();
  return <TimeWorkspace section={section} />;
}
