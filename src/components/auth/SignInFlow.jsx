import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PhoneStep from "@/components/auth/PhoneStep";
import CodeStep from "@/components/auth/CodeStep";
import { api, USE_MOCK } from "@/lib/api";
import { useSession } from "@/lib/SessionContext";

export default function SignInFlow() {
  const { applyMe } = useSession();
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState("phone");

  const demo = () => applyMe(api.demoSignIn());

  return (
    <div className="pt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Feed · Hay · Bedding</p>
      <h1 className="font-heading text-5xl leading-none mt-2">
        {step === "phone" ? "Order ahead. Pick up fast." : "Check your texts"}
      </h1>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="mt-6"
        >
          {step === "phone" ? (
            <PhoneStep phone={phone} setPhone={setPhone} onSent={() => setStep("code")} />
          ) : (
            <CodeStep phone={phone} onBack={() => setStep("phone")} />
          )}
        </motion.div>
      </AnimatePresence>
      {USE_MOCK && step === "phone" && (
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground mb-3">SCR staff reviewing the app? Skip sign-in with a demo account.</p>
          <button
            type="button"
            onClick={demo}
            className="w-full h-12 rounded-2xl border-2 border-input bg-card font-bold flex items-center justify-center gap-2 select-none active:opacity-80"
          >
            View demo
          </button>
        </div>
      )}
    </div>
  );
}