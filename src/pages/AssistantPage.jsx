import React from "react";
import BackHeader from "@/components/layout/BackHeader";
import AssistantChat from "@/components/assistant/AssistantChat";
import { useSession } from "@/lib/SessionContext";

export default function AssistantPage() {
  const { customer } = useSession();
  const context = customer ? { firstName: customer.firstName, store: customer.preferredStore } : {};
  return (
    <div>
      <BackHeader title="Ask SCR" />
      <div className="pt-3">
        <p className="text-muted-foreground">
          Feed, orders, reorders, and farm questions — the SCR assistant is here to help.
        </p>
        <AssistantChat
          className="mt-4 h-[62vh]"
          context={context}
          greeting={`Hi${customer?.firstName ? ` ${customer.firstName}` : ""}! What can I help you with?`}
        />
      </div>
    </div>
  );
}