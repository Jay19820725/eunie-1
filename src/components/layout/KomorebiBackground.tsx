import React from 'react';
import { motion } from 'motion/react';

export const KomorebiBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-[#FDFCF8]">
      {/* GPU Accelerated layers of soft light */}
      <motion.div 
        animate={{
          x: [0, 40, -20, 0],
          y: [0, -30, 50, 0],
          scale: [1, 1.1, 0.9, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-wood/5 rounded-full blur-[100px] md:blur-[200px]" 
      />
      <motion.div 
        animate={{
          x: [0, -50, 30, 0],
          y: [0, 40, -60, 0],
          scale: [1, 0.9, 1.2, 1],
          rotate: [0, -8, 8, 0],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
          delay: -5
        }}
        className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-fire/5 rounded-full blur-[90px] md:blur-[180px]" 
      />
      <motion.div 
        animate={{
          x: [0, 30, -40, 0],
          y: [0, 60, -20, 0],
          scale: [1, 1.15, 0.85, 1],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: "easeInOut",
          delay: -10
        }}
        className="absolute top-[30%] right-[15%] w-[60%] h-[60%] bg-water/5 rounded-full blur-[80px] md:blur-[160px]" 
      />
      <motion.div 
        animate={{
          x: [0, -20, 40, 0],
          y: [0, -50, 30, 0],
          scale: [1, 0.8, 1.1, 1],
        }}
        transition={{
          duration: 35,
          repeat: Infinity,
          ease: "easeInOut",
          delay: -15
        }}
        className="absolute bottom-[20%] left-[10%] w-[55%] h-[55%] bg-earth/5 rounded-full blur-[70px] md:blur-[140px]" 
      />
      
      {/* Pulsing light cores */}
      <motion.div 
        animate={{ opacity: [0.05, 0.15, 0.05], scale: [1, 1.05, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[10%] left-[20%] w-48 h-48 bg-white/10 rounded-full blur-[60px] md:blur-[100px]" 
      />
      <motion.div 
        animate={{ opacity: [0.05, 0.12, 0.05], scale: [1, 1.08, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: -3 }}
        className="absolute bottom-[15%] right-[25%] w-64 h-64 bg-white/10 rounded-full blur-[70px] md:blur-[120px]" 
      />

      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/p6.png')]" />
      
      {/* Vignette for focus */}
      <div className="absolute inset-0 bg-radial-[circle_at_center,_transparent_0%,_rgba(253,252,248,0.4)_100%]" />
    </div>
  );
};
