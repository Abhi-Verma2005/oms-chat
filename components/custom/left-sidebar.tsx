"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { SlashIcon, Menu, X } from "lucide-react";

import { History } from "./history";
import Logo from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

import { signOutAction } from "@/lib/actions";

interface LeftSidebarProps {
  user?: any;
  onCollapseChange?: (isCollapsed: boolean) => void;
}

export function LeftSidebar({ user, onCollapseChange }: LeftSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleToggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapseChange?.(newCollapsed);
  };

  return (
    <div className={`flex flex-col h-screen bg-card border-r border-border transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Top Section - Logo & App Name + Toggle Button (20%) */}
      <div className="flex-shrink-0 p-4 border-b border-border relative" style={{ height: '20%', minHeight: '80px' }}>
        <div className="flex flex-col items-center justify-center h-full space-y-3">
          {/* Logo and App Name */}
          {!isCollapsed ? (
            <>
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
            </>
          ) : (
            <Logo href="/" size={32} />
          )}
        </div>

        {/* Toggle Button - Positioned at bottom of section, close to separator */}
        <div className="absolute bottom-2 left-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleCollapse}
            className="p-1 h-6 w-6 opacity-70 hover:opacity-100 transition-all duration-300"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Middle Section - Chat History (70%) */}
      <div className="flex-1 p-4 overflow-hidden" style={{ height: '70%' }}>
        <div className="h-full flex flex-col">
          {!isCollapsed && (
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-foreground">Recent Chats</h3>
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
            <History 
              user={user} 
              isCollapsed={isCollapsed} 
              onItemClick={() => {
                if (!isCollapsed) {
                  setIsCollapsed(true);
                  onCollapseChange?.(true);
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Section - Profile & Settings (10%) */}
      <div className="flex-shrink-0 p-4 border-t border-border" style={{ height: '10%', minHeight: '60px' }}>
        <div className="flex flex-col items-center justify-center h-full space-y-3">
          {user ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  {!isCollapsed ? (
                    <Button
                      className="w-full py-2 px-3 h-fit font-normal bg-secondary hover:bg-secondary/80 text-secondary-foreground justify-start cursor-pointer"
                      variant="secondary"
                    >
                      <div className="flex items-center space-x-2 w-full">
                        <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                          {user.email?.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate flex-1">{user.email}</span>
                      </div>
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0 rounded-full bg-purple-500 hover:bg-purple-600 text-white cursor-pointer"
                    >
                      {user.email?.charAt(0).toUpperCase()}
                    </Button>
                  )}
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
              
            </>
          ) : (
            <Button 
              className={`w-full py-2 px-3 h-fit font-normal bg-primary hover:bg-primary/90 text-primary-foreground ${isCollapsed ? 'w-8 h-8 p-0' : ''}`} 
              asChild
            >
              <Link href="/login">
                {isCollapsed ? <Menu className="h-4 w-4" /> : 'Login'}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
