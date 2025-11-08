"use client";

import * as SheetPrimitive from "@radix-ui/react-dialog";
import { SlashIcon, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { History } from "./history";
import Logo from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { signOutAction } from "../../lib/actions";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface LeftSidebarProps {
  user?: any;
  onCollapseChange?: (isCollapsed: boolean) => void;
}

const SheetOverlay = SheetPrimitive.Overlay;

export function LeftSidebar({ user, onCollapseChange }: LeftSidebarProps) {
  const [open, setOpen] = useState(false);

  // Sync with parent component
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onCollapseChange?.(!newOpen); // Inverted: when sheet is open, sidebar is NOT collapsed
  };

  return (
    <>
      {/* Always visible menu button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-9 w-9 rounded-md hover:bg-accent opacity-70 hover:opacity-100 transition-all duration-300"
        title="Open sidebar"
      >
        <Menu className="size-5" />
      </Button>

      {/* Sheet overlay */}
      <SheetPrimitive.Root open={open} onOpenChange={handleOpenChange}>
        <SheetPrimitive.Portal>
          {/* Custom overlay with blur */}
          <SheetOverlay 
            className={cn(
              "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
            )}
          />
          
          {/* Sidebar content */}
          <SheetPrimitive.Content
            className={cn(
              "fixed z-50 bg-card border-r border-border",
              "inset-y-0 left-0 h-full w-64",
              "transition ease-in-out",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:duration-300 data-[state=open]:duration-500",
              "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left"
            )}
          >
            {/* Top Section - Logo & App Name (20%) */}
            <div className="shrink-0 p-4 border-b border-border relative" style={{ height: '20%', minHeight: '80px' }}>
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div className="flex items-center space-x-3">
                  <Logo href="/" size={32} />
                  <div className="text-muted-foreground">
                    <SlashIcon size={20} />
                  </div>
                  <div className="text-lg font-semibold text-foreground">
                    OMS Chat
                  </div>
                </div>
                <div className="text-sm text-muted-foreground text-center">
                  AI-Powered Publisher Discovery
                </div>
              </div>

              {/* Close Button */}
              <div className="absolute bottom-2 left-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="p-1 size-6 opacity-70 hover:opacity-100 transition-all duration-300"
                  title="Close sidebar"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            {/* Middle Section - Chat History (70%) */}
            <div className="flex-1 p-4 overflow-hidden" style={{ height: '70%' }}>
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-foreground">Recent Chats</h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <History 
                    user={user} 
                    isCollapsed={false}
                    onItemClick={() => {
                      setOpen(false);
                      onCollapseChange?.(true);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Section - Profile & Settings (10%) */}
            <div className="shrink-0 p-4 border-t border-border" style={{ height: '10%', minHeight: '60px' }}>
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        className="w-full py-2 px-3 h-fit font-normal bg-secondary hover:bg-secondary/80 text-secondary-foreground justify-start cursor-pointer"
                        variant="secondary"
                      >
                        <div className="flex items-center space-x-2 w-full">
                          <div className="size-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                            {user.email?.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate flex-1">{user.email}</span>
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuItem className="p-0">
                        <ThemeToggle />
                      </DropdownMenuItem>
                      <DropdownMenuItem className="p-1 z-50">
                        <form
                          className="w-full"
                          action={signOutAction}
                        >
                          <button
                            type="submit"
                            className="w-full text-left px-1 py-0.5 text-red-500"
                          >
                            Sign out
                          </button>
                        </form>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button 
                    className="w-full py-2 px-3 h-fit font-normal bg-primary hover:bg-primary/90 text-primary-foreground" 
                    asChild
                  >
                    <Link href="/login">
                      Login
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </SheetPrimitive.Content>
        </SheetPrimitive.Portal>
      </SheetPrimitive.Root>
    </>
  );
}
