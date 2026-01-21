import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Box } from 'lucide-react';

export default function EmptyState({ icon: Icon = Box, title, description, className }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={clsx("flex flex-col items-center justify-center p-8 text-center", className)}
        >
            <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4 ring-1 ring-gray-700/50 relative overflow-hidden">
                <Icon className="w-8 h-8 text-gray-600 relative z-10" />
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-gray-700/10" />
            </div>
            <h3 className="text-gray-300 font-bold text-sm mb-1">{title}</h3>
            {description && <p className="text-xs text-gray-500 max-w-[200px]">{description}</p>}
        </motion.div>
    );
}
