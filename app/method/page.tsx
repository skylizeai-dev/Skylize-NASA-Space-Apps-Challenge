import type { Metadata } from "next";
import MethodContent from "@/components/MethodContent";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: `Method and data: ${APP_NAME}`,
  description: "The ranking formula, the coverage rule, the data rules and the limits.",
};

export default function MethodPage() {
  return <MethodContent />;
}
