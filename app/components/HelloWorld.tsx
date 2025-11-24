import { motion } from 'framer-motion';

/**
 * HelloWorld Component
 * A simple React component that displays a Hello World message
 * This is a basic example component for ticket test-001
 */
export const HelloWorld = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <motion.h1
          className="text-6xl font-bold text-indigo-900 mb-4"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          Hello World
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-xl text-indigo-700"
        >
          Welcome to the Hello World React Component
        </motion.p>
      </motion.div>
    </div>
  );
};
