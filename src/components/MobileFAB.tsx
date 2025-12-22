import { Plus } from "lucide-react";
import { motion } from "framer-motion";

export default function MobileFAB({ onClick }: { onClick: () => void }) {
    return (
        <motion.button
            onClick={onClick}
            className="md:hidden fixed right-5 bottom-24 w-14 h-14 bg-[#007AFF] rounded-full shadow-lg shadow-[#007AFF]/40 flex items-center justify-center text-white z-40 active:scale-90 transition-transform"
            whileTap={{ scale: 0.9 }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
        >
            <Plus size={28} strokeWidth={2.5} />
        </motion.button>
    );
}
