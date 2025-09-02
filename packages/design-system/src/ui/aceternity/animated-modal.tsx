"use client";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../../utils";
import { useKatalyst, React } from "@katalyst/hooks";
// Using Katalyst's enhanced React hooks with Rust performance optimizations

interface AnimatedModalProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedModal({ children, className }: AnimatedModalProps) {
  const k = useKatalyst();
  const [open, setOpen] = React.useState(false);
  const modalRef = React.useRef<HTMLDivElement>(null);

  k.dom.outsideClick(modalRef, () => setOpen(false));

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className={cn("cursor-pointer", className)}
      >
        {children}
      </div>
      <AnimatedModalBody open={open} setOpen={setOpen} modalRef={modalRef} />
    </>
  );
}

interface AnimatedModalBodyProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  modalRef: React.RefObject<HTMLDivElement>;
}

export function AnimatedModalBody({
  open,
  setOpen,
  modalRef,
}: AnimatedModalBodyProps) {
  const k = useKatalyst();
  
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            ref={modalRef}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl dark:bg-gray-900"
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div className="mt-4">
              {/* Modal content goes here */}
              <h2 className="text-2xl font-bold">Animated Modal</h2>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                This modal uses Katalyst hooks for enhanced functionality.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}