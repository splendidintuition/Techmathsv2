import type { Metadata } from "next";
import { OperationsPortal } from "@/components/operations-portal";

export const metadata: Metadata = {
  title: "Operations portal",
  description: "Secure TechMaths operations portal for authorized clients and field engineers.",
  robots: { index: false, follow: false },
};

export default function PortalPage() {
  return <OperationsPortal />;
}
