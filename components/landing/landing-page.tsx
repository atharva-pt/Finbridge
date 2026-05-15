"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Brain,
  Building2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  FileText,
  ChevronRight,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type FadeUpVariants = {
  hidden: { opacity: number; y: number };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visible: (i?: number) => any;
};

const fadeUp: FadeUpVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

const features = [
  {
    icon: Brain,
    title: "AI Invoice Extraction",
    description:
      "Claude Vision reads invoices, receipts, and bank statements — extracting structured data with vendor names, amounts, GST, and line items in seconds.",
    badge: "Powered by Claude",
    color: "from-indigo-500/20 to-violet-500/20",
    iconColor: "text-indigo-500 dark:text-indigo-400",
    borderColor: "border-indigo-500/20",
  },
  {
    icon: Building2,
    title: "Multi-Tenant Workspaces",
    description:
      "Accounting firms and their client companies operate in fully isolated, secure environments — with role-based access control across every tier.",
    badge: "Enterprise Ready",
    color: "from-violet-500/20 to-purple-500/20",
    iconColor: "text-violet-500 dark:text-violet-400",
    borderColor: "border-violet-500/20",
  },
  {
    icon: CheckCircle2,
    title: "Smart Review Workflow",
    description:
      "Accountants receive extracted data for review, can annotate, refine, accept or reject — replacing messy WhatsApp threads with an intelligent audit trail.",
    badge: "Workflow Automation",
    color: "from-purple-500/20 to-pink-500/20",
    iconColor: "text-purple-500 dark:text-purple-400",
    borderColor: "border-purple-500/20",
  },
];

const mockData = [
  { label: "Vendor", value: "Acme Technologies Pvt. Ltd.", confidence: 99 },
  { label: "Invoice No.", value: "INV-2024-00847", confidence: 98 },
  { label: "Amount", value: "₹1,42,500.00", confidence: 97 },
  { label: "GST (18%)", value: "₹25,650.00", confidence: 96 },
  { label: "Total", value: "₹1,68,150.00", confidence: 99 },
  { label: "Due Date", value: "31 Jan 2025", confidence: 94 },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Grid background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
        }}
      />

      {/* Gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-purple-600/8 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-base font-semibold tracking-tight">
              Fin<span className="text-indigo-600 dark:text-indigo-400">Bridge</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#workflow" className="hover:text-foreground transition-colors">How it works</a>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium bg-primary hover:bg-primary/90 transition-colors text-primary-foreground px-4 py-1.5 rounded-lg"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-40 pb-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            custom={0}
            variants={fadeUp}
          >
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-xs font-medium px-3.5 py-1.5 rounded-full mb-8">
              <Sparkles className="w-3 h-3" />
              AI-powered financial data exchange
            </div>
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            custom={1}
            variants={fadeUp}
            className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6"
          >
            The Modern{" "}
            <span className="relative inline-block">
              <span className="gradient-text">
                Financial Exchange
              </span>
            </span>{" "}
            Platform
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            custom={2}
            variants={fadeUp}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Replace WhatsApp forwards and email threads with intelligent workflows.
            Upload a document, let AI extract the data, and your accountant reviews
            it — all in one place.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            custom={3}
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link
              href="/register"
              className="group flex items-center gap-2 bg-primary hover:bg-primary/90 transition-all text-primary-foreground font-medium px-6 py-3 rounded-xl text-sm shadow-lg shadow-primary/20 hover:shadow-primary/30"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 border border-border hover:border-border transition-all text-secondary-foreground font-medium px-6 py-3 rounded-xl text-sm"
            >
              See Demo
              <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Mock UI Preview */}
          <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-20 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background z-10 pointer-events-none" />
            <div className="bg-card border border-border rounded-2xl p-5 shadow-2xl shadow-black/10 dark:shadow-black/50 max-w-2xl mx-auto text-left card-shadow">
              {/* Window chrome */}
              <div className="flex items-center gap-1.5 mb-5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                <div className="flex-1 mx-4 bg-muted rounded-md px-3 py-1 text-xs text-muted-foreground font-mono">
                  finbridge.app/company/documents
                </div>
              </div>

              {/* Header row */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  <span className="text-sm font-medium text-foreground">
                    Invoice_Acme_Nov2024.pdf
                  </span>
                </div>
                <span className="text-xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-medium">
                  AI Extracted
                </span>
              </div>

              {/* Data rows */}
              <div className="space-y-2">
                {mockData.map((row, i) => (
                  <motion.div
                    key={row.label}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.07, duration: 0.4 }}
                    className="flex items-center justify-between bg-muted/50 hover:bg-muted border border-border rounded-lg px-3.5 py-2.5 transition-colors"
                  >
                    <span className="text-xs text-muted-foreground w-24 shrink-0">{row.label}</span>
                    <span className="text-sm font-medium text-foreground flex-1">{row.value}</span>
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-mono ml-2">
                      {row.confidence}%
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Action row */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                <button className="flex-1 text-xs font-medium bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-600 dark:text-indigo-300 py-2 rounded-lg transition-colors">
                  Accept
                </button>
                <button className="flex-1 text-xs font-medium bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground py-2 rounded-lg transition-colors">
                  Request Info
                </button>
                <button className="flex-1 text-xs font-medium bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-600 dark:text-red-400 py-2 rounded-lg transition-colors">
                  Reject
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-4">
              Platform Features
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Everything your firm needs
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Built for accounting firms and their clients — from document upload to final reconciliation.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                custom={i}
                variants={fadeUp}
                className={`relative group bg-card border ${feature.borderColor} rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 overflow-hidden card-shadow`}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                />
                <div className="relative">
                  <div className={`w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center mb-4 ${feature.iconColor}`}>
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <div className="inline-block text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-md mb-3">
                    {feature.badge}
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="workflow" className="relative py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-4">
              How It Works
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              From upload to reconciliation
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              A streamlined three-step process that saves hours of manual work.
            </p>
          </motion.div>

          <div className="space-y-4">
            {[
              {
                step: "01",
                title: "Company uploads a document",
                desc: "Drag-and-drop invoices, receipts, or bank statements. FinBridge accepts PDFs and images.",
                icon: FileText,
              },
              {
                step: "02",
                title: "Claude AI extracts structured data",
                desc: "Claude Vision parses the document and extracts vendor, amounts, GST, line items, due dates — with confidence scores.",
                icon: Brain,
              },
              {
                step: "03",
                title: "Accountant reviews & approves",
                desc: "Your assigned accountant reviews the extraction, annotates if needed, and accepts or requests more information.",
                icon: Shield,
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                custom={i}
                variants={fadeUp}
                className="flex items-start gap-5 bg-card border border-border rounded-xl p-5 hover:border-primary/20 transition-colors card-shadow"
              >
                <div className="text-3xl font-bold text-muted-foreground/20 font-mono w-10 shrink-0 pt-0.5">
                  {item.step}
                </div>
                <div className="w-9 h-9 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="relative bg-gradient-to-br from-indigo-500/10 to-violet-500/10 dark:from-indigo-900/30 dark:to-violet-900/30 border border-indigo-500/20 rounded-2xl p-12 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-violet-600/5" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Ready to modernize your workflow?
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
                Join accounting firms already using FinBridge to streamline their client data exchange.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/register"
                  className="group flex items-center gap-2 bg-primary hover:bg-primary/90 transition-all text-primary-foreground font-medium px-7 py-3 rounded-xl text-sm shadow-lg shadow-primary/25"
                >
                  Start for free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-3"
                >
                  Already have an account? Sign in
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-medium">
              Fin<span className="text-indigo-600 dark:text-indigo-400">Bridge</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} FinBridge. Built for the modern accounting firm.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
