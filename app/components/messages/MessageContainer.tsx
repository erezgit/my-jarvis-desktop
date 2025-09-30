import React from "react";

interface MessageContainerProps {
  alignment: "left" | "right" | "center";
  colorScheme: string;
  children: React.ReactNode;
}

export function MessageContainer({
  alignment,
  colorScheme,
  children,
}: MessageContainerProps) {
  const justifyClass =
    alignment === "right"
      ? "justify-end"
      : alignment === "center"
        ? "justify-center"
        : "justify-start";

  return (
    <div className={`mb-4 flex ${justifyClass}`}>
      <div
        className={`max-w-[85%] sm:max-w-[70%] rounded-lg ${alignment === 'left' ? 'pr-2 pl-0' : 'px-3.5'} py-1.5 ${colorScheme}`}
      >
        {children}
      </div>
    </div>
  );
}
