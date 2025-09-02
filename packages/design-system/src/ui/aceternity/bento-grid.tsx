"use client";
import { motion } from "framer-motion";
import { cn } from "../../utils";
import { useKatalyst, React } from "@katalyst/hooks";
// Using Katalyst's Rust-powered React for enhanced performance

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  const k = useKatalyst();
  const isMobile = k.$.mediaQuery("(max-width: 640px)");
  const gridCols = isMobile ? "grid-cols-1" : "grid-cols-3";

  return (
    <div
      className={cn(
        `grid ${gridCols} gap-4 md:auto-rows-[18rem]`,
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}) => {
  const k = useKatalyst();
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = k.dom.inView(ref, { threshold: 0.1 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "row-span-1 rounded-xl group/bento hover:shadow-xl transition duration-200 shadow-input dark:shadow-none p-4 dark:bg-black dark:border-white/[0.2] bg-white border border-transparent justify-between flex flex-col space-y-4",
        className
      )}
    >
      {header}
      <div className="group-hover/bento:translate-x-2 transition duration-200">
        {icon}
        <div className="font-sans font-bold text-neutral-600 dark:text-neutral-200 mb-2 mt-2">
          {title}
        </div>
        <div className="font-sans font-normal text-neutral-600 text-xs dark:text-neutral-300">
          {description}
        </div>
      </div>
    </motion.div>
  );
};