"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

const stagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export function TransactionsSkeleton() {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="divide-y divide-border"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          variants={fadeUp}
          className="flex items-center gap-4 px-5 py-4"
        >
          {/* Avatar / icon */}
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          {/* Name + vendor */}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-2.5 w-32" />
          </div>
          {/* Type */}
          <Skeleton className="h-3 w-16 hidden lg:block" />
          {/* Amount */}
          <Skeleton className="h-3 w-20" />
          {/* Status badge */}
          <Skeleton className="h-5 w-20 rounded-full" />
          {/* Date */}
          <Skeleton className="h-3 w-16 hidden lg:block" />
          {/* Chevron */}
          <Skeleton className="h-4 w-4 rounded hidden lg:block" />
        </motion.div>
      ))}
    </motion.div>
  );
}
