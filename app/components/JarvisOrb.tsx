export function JarvisOrb() {
  return (
    <div className="relative w-5 h-5 flex items-center justify-center">
      {/* Animated gradient background */}
      <div className="absolute inset-0 rounded-full overflow-hidden">
        <div className="absolute inset-0 animate-gradient-shift">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-blue-500 to-cyan-600 opacity-90" />
        </div>
      </div>

      {/* Breathing animation overlay */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-300 to-blue-400 animate-pulse-slow opacity-60" />

      {/* Inner glow */}
      <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/30 to-transparent" />

      {/* Center dot */}
      <div className="relative w-1 h-1 rounded-full bg-white/80 animate-pulse-slow" />
    </div>
  );
}
