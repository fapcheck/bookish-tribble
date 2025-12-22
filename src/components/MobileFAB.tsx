import { Plus } from "lucide-react";
import { motion } from "framer-motion";

export default function MobileFAB({ onClick }: { onClick: () => void }) {
    return (
        <motion.button
            onClick={onClick}
            className="md:hidden fixed right-4 bottom-24 w-14 h-14 bg-indigo-600 rounded-full shadow-lg shadow-indigo-600/40 flex items-center justify-center text-white z-40 active:scale-90 transition-transform"
            whileTap={{ scale: 0.9 }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
        >
            <Plus size={28} />
        </motion.button>
    );
}
