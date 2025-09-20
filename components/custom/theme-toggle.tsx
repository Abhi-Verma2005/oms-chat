"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newTheme = theme === "dark" ? "light" : "dark";
    console.log("Current theme:", theme, "Switching to:", newTheme);
    setTheme(newTheme);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div
      className="w-full cursor-pointer p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
      onClick={handleToggle}
    >
      {`Toggle ${theme === "light" ? "dark" : "light"} mode`}
    </div>
  );
}
