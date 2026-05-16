"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

const stagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function CompaniesSkeleton() {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          variants={fadeUp}
          className="bg-card border border-border rounded-2xl p-5 space-y-4"
        >
          {/* Header: avatar + name + badge */}
          <div className="flex items-start gap-4">
            <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
              <Skeleton className="h-2.5 w-40" />
            </div>
            <Skeleton className="h-4 w-4 rounded shrink-0 mt-1" />
          </div>

          {/* Stats grid: 4 boxes */}
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <div
                key={j}
                className="rounded-xl p-2.5 space-y-1.5 flex flex-col items-center"
              >
                <Skeleton className="h-3.5 w-3.5 rounded" />
                <Skeleton className="h-4 w-6" />
                <Skeleton className="h-2 w-8" />
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="h-2 w-28" />
          </div>

          {/* Onboarded date */}
          <Skeleton className="h-2 w-36" />
        </motion.div>
      ))}
    </motion.div>
  );
}
