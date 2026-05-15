"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Zap,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  Lock,
  Mail,
  User,
  Building2,
  ChevronDown,
} from "lucide-react";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["COMPANY_ADMIN", "FIRM_ADMIN", "FIRM_ACCOUNTANT", "COMPANY_USER"]),
  companyName: z.string().optional(),
  firmName: z.string().optional(),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const roleOptions = [
  {
    value: "COMPANY_ADMIN",
    label: "Company Admin",
    desc: "Manage your company's documents and users",
  },
  {
    value: "FIRM_ADMIN",
    label: "Accounting Firm Admin",
    desc: "Manage your firm and client companies",
  },
  {
    value: "FIRM_ACCOUNTANT",
    label: "Accountant",
    desc: "Review and process client documents",
  },
  {
    value: "COMPANY_USER",
    label: "Company User",
    desc: "Upload and track financial documents",
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "COMPANY_ADMIN" },
  });

  const selectedRole = watch("role");
  const isCompanyRole = selectedRole === "COMPANY_ADMIN" || selectedRole === "COMPANY_USER";
  const isFirmRole = selectedRole === "FIRM_ADMIN" || selectedRole === "FIRM_ACCOUNTANT";

  async function onSubmit(data: RegisterFormValues) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "Registration failed");
        return;
      }

      if (result.pendingApproval) {
        toast.info("Account created! An admin will review your access request.");
      } else {
        toast.success("Account created! Welcome to FinBridge.");
      }
      router.push(result.redirectUrl);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid md:grid-cols-2 min-h-[700px] rounded-2xl overflow-hidden border border-border shadow-2xl shadow-black/50">
        {/* Left brand panel */}
        <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-violet-950 via-indigo-900/80 to-indigo-950 p-10 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div
              style={{
                backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)`,
                backgroundSize: "28px 28px",
                width: "100%",
                height: "100%",
              }}
            />
          </div>
          <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-violet-500/20 rounded-full blur-[60px]" />

          <div className="relative flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-base font-semibold text-white">FinBridge</span>
          </div>

          <div className="relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <h2 className="text-2xl font-bold text-white mb-3 leading-snug">
                Join thousands of teams managing finances smarter
              </h2>
              <p className="text-indigo-200/60 text-sm leading-relaxed mb-8">
                Set up your workspace in minutes. Connect with your accounting firm
                and start exchanging financial data securely.
              </p>

              <div className="space-y-3.5">
                {[
                  { title: "Free to start", desc: "No credit card required" },
                  { title: "AI-powered", desc: "Automatic document extraction" },
                  { title: "Secure by default", desc: "End-to-end encrypted data" },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-indigo-400/20 border border-indigo-400/30 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">{item.title}</div>
                      <div className="text-xs text-indigo-300/40">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="relative text-xs text-indigo-300/30">
            Your data is always private and secure
          </div>
        </div>

        {/* Right form panel */}
        <div className="bg-card p-8 md:p-10 flex flex-col justify-center overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Mobile logo */}
            <div className="flex md:hidden items-center gap-2 mb-6">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-semibold text-foreground">FinBridge</span>
            </div>

            <div className="mb-7">
              <h1 className="text-2xl font-bold text-foreground mb-2">Create your account</h1>
              <p className="text-sm text-muted-foreground">Get started with FinBridge for free</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Full name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    {...register("name")}
                    type="text"
                    autoComplete="name"
                    placeholder="Rahul Sharma"
                    className="w-full bg-muted border border-border hover:border-primary/20 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition-all"
                  />
                </div>
                {errors.name && (
                  <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    {...register("email")}
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    className="w-full bg-muted border border-border hover:border-primary/20 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition-all"
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                    className="w-full bg-muted border border-border hover:border-primary/20 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 rounded-xl pl-10 pr-10 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  I am a...
                </label>
                <div className="relative">
                  <select
                    {...register("role")}
                    className="w-full appearance-none bg-muted border border-border hover:border-primary/20 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-2.5 text-sm text-foreground outline-none transition-all cursor-pointer"
                  >
                    {roleOptions.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-card text-foreground">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
                {selectedRole && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {roleOptions.find((r) => r.value === selectedRole)?.desc}
                  </p>
                )}
              </div>

              {/* Company name (for company roles) */}
              {isCompanyRole && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Company name
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      {...register("companyName")}
                      type="text"
                      placeholder="Acme Technologies Pvt. Ltd."
                      className="w-full bg-muted border border-border hover:border-primary/20 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition-all"
                    />
                  </div>
                </motion.div>
              )}

              {/* Firm name (for firm roles) */}
              {isFirmRole && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Accounting firm name
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      {...register("firmName")}
                      type="text"
                      placeholder="Sharma & Associates CA"
                      className="w-full bg-muted border border-border hover:border-primary/20 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition-all"
                    />
                  </div>
                </motion.div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="group w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-white font-medium py-2.5 rounded-xl text-sm mt-2 shadow-lg shadow-indigo-500/20"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create account
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>

              <p className="text-xs text-muted-foreground text-center">
                By creating an account, you agree to our Terms of Service and Privacy Policy.
              </p>
            </form>

            <div className="mt-5 pt-5 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
