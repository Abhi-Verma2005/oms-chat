"use client";

import cx from "classnames";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { User } from "next-auth";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";



import {
  InfoIcon,
  MoreHorizontalIcon,
  PencilEditIcon,
  TrashIcon,
} from "./icons";
import { Chat } from "../../db/schema";
import { fetcher, getTitleFromChat } from "../../lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";



export const History = ({ 
  user, 
  isCollapsed = false, 
  onItemClick 
}: { 
  user: User | undefined; 
  isCollapsed?: boolean;
  onItemClick?: () => void;
}) => {
  const { id } = useParams();
  const pathname = usePathname();

  const {
    data: history,
    isLoading,
    mutate,
  } = useSWR<Array<Chat>>(user ? "/api/history" : null, fetcher, {
    fallbackData: [],
  });

  useEffect(() => {
    mutate();
  }, [pathname, mutate]);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = async () => {
    const deletePromise = fetch(`/api/chat?id=${deleteId}`, {
      method: "DELETE",
    });

    toast.promise(deletePromise, {
      loading: "Deleting chat...",
      success: () => {
        mutate((history) => {
          if (history) {
            return history.filter((h) => h.id !== id);
          }
        });
        return "Chat deleted successfully";
      },
      error: "Failed to delete chat",
    });

    setShowDeleteDialog(false);
  };

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center space-y-2">
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {history?.length || 0} chats
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {user && (
          <Button
            className="w-full font-normal text-sm flex flex-row justify-between text-white"
            asChild
          >
            <Link href="/" onClick={onItemClick}>
              <div>Start a new chat</div>
              <PencilEditIcon size={14} />
            </Link>
          </Button>
        )}

        <div className="flex flex-col overflow-y-auto space-y-1 max-h-64">
          {!user ? (
            <div className="text-zinc-500 w-full flex flex-row justify-center items-center text-xs gap-2 py-4">
              <InfoIcon />
              <div>Login to save chats!</div>
            </div>
          ) : null}

          {!isLoading && history?.length === 0 && user ? (
            <div className="text-zinc-500 w-full flex flex-row justify-center items-center text-xs gap-2 py-4">
              <InfoIcon />
              <div>No chats found</div>
            </div>
          ) : null}

          {isLoading && user ? (
            <div className="flex flex-col space-y-2">
              {[44, 32, 28, 52].map((item) => (
                <div key={item} className="p-2">
                  <div
                    className={`w-${item} h-[16px] rounded-md bg-zinc-200 dark:bg-zinc-600 animate-pulse`}
                  />
                </div>
              ))}
            </div>
          ) : null}

          {history &&
            history.map((chat) => (
              <div
                key={chat.id}
                className={cx(
                  "flex flex-row items-center gap-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md pr-2",
                  { "bg-zinc-200 dark:bg-zinc-700": chat.id === id },
                )}
              >
                <Button
                  variant="ghost"
                  className={cx(
                    "hover:bg-zinc-200 dark:hover:bg-zinc-700 justify-between p-0 text-xs font-normal flex flex-row items-center gap-2 pr-2 w-full transition-none",
                  )}
                  asChild
                >
                  <Link
                    href={`/chat/${chat.id}`}
                    className="text-ellipsis overflow-hidden text-left py-1 pl-2 rounded-lg outline-zinc-900"
                    onClick={onItemClick}
                  >
                    {getTitleFromChat(chat)}
                  </Link>
                </Button>

                <DropdownMenu modal={true}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="p-0 h-fit font-normal text-zinc-500 transition-none hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      variant="ghost"
                    >
                      <MoreHorizontalIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="left" className="z-[60]">
                    <DropdownMenuItem asChild>
                      <Button
                        className="flex flex-row gap-2 items-center justify-start w-full h-fit font-normal p-1.5 rounded-sm"
                        variant="ghost"
                        onClick={() => {
                          setDeleteId(chat.id);
                          setShowDeleteDialog(true);
                          onItemClick?.();
                        }}
                      >
                        <TrashIcon />
                        <div>Delete</div>
                      </Button>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
        </div>
      </div>


      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              chat and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
