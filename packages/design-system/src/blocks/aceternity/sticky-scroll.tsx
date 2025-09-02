"use client";
import { useMotionValueEvent, useScroll } from "framer-motion";
import { motion } from "framer-motion";
import { cn } from "../../utils";
import { useKatalyst, React } from "@katalyst/hooks";
// Rust-optimized React from Katalyst

export const StickyScroll = ({
  content,
  contentClassName,
}: {
  content: {
    title: string;
    description: string;
    content?: React.ReactNode | any;
  }[];
  contentClassName?: string;
}) => {
  const k = useKatalyst();
  const [activeCard, setActiveCard] = React.useState(0);
  const ref = React.useRef<any>(null);
  const { scrollYProgress } = useScroll({
    container: ref,
    offset: ["start start", "end start"],
  });
  const cardLength = content.length;
  const scrollDirection = k.dom.scrollDirection();

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const cardsBreakpoints = content.map((_, index) => index / cardLength);
    const closestBreakpointIndex = cardsBreakpoints.reduce(
      (acc, breakpoint, index) => {
        const distance = Math.abs(latest - breakpoint);
        if (distance < Math.abs(latest - cardsBreakpoints[acc])) {
          return index;
        }
        return acc;
      },
      0
    );
    setActiveCard(closestBreakpointIndex);
  });

  const backgroundColors = [
    "var(--slate-900)",
    "var(--black)",
    "var(--neutral-900)",
  ];
  const linearGradients = [
    "linear-gradient(to bottom right, var(--cyan-500), var(--emerald-500))",
    "linear-gradient(to bottom right, var(--pink-500), var(--indigo-500))",
    "linear-gradient(to bottom right, var(--orange-500), var(--yellow-500))",
  ];

  const [backgroundGradient, setBackgroundGradient] = React.useState(
    linearGradients[0]
  );

  React.useEffect(() => {
    setBackgroundGradient(linearGradients[activeCard % linearGradients.length]);
  }, [activeCard]);

  return (
    <motion.div
      animate={{
        backgroundColor: backgroundColors[activeCard % backgroundColors.length],
      }}
      className="h-[30rem] overflow-y-auto flex justify-center relative space-x-10 rounded-md p-10"
      ref={ref}
    >
      <div className="div relative flex items-start px-4">
        <div className="max-w-2xl">
          {content.map((item, index) => (
            <div key={item.title + index} className="my-20">
              <ContentCard
                item={item}
                index={index}
                activeCard={activeCard}
                scrollDirection={scrollDirection}
              />
            </div>
          ))}
          <div className="h-40" />
        </div>
      </div>
      <div
        style={{ background: backgroundGradient }}
        className={cn(
          "hidden lg:block h-60 w-80 rounded-md bg-white sticky top-10 overflow-hidden",
          contentClassName
        )}
      >
        {content[activeCard].content ?? null}
      </div>
    </motion.div>
  );
};

const ContentCard = ({
  item,
  index,
  activeCard,
  scrollDirection,
}: {
  item: {
    title: string;
    description: string;
    content?: React.ReactNode;
  };
  index: number;
  activeCard: number;
  scrollDirection: "up" | "down" | null;
}) => {
  const k = useKatalyst();
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = k.dom.inView(ref, { threshold: 0.5 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: isInView ? 1 : 0.3,
        y: scrollDirection === "down" ? 0 : -10
      }}
      className={cn(
        "text-2xl font-bold text-slate-100",
        activeCard === index ? "opacity-100" : "opacity-30"
      )}
    >
      <h2>{item.title}</h2>
      <p className="text-kg text-slate-300 max-w-sm mt-10">
        {item.description}
      </p>
    </motion.div>
  );
};