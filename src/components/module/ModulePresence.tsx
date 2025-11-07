import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Users } from "lucide-react";

interface PresenceUser {
  user_id: string;
  full_name: string | null;
  online_at: string;
}

interface ModulePresenceProps {
  users: PresenceUser[];
  variant?: "compact" | "full";
}

export const ModulePresence = ({ users, variant = "compact" }: ModulePresenceProps) => {
  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (userId: string) => {
    // Generate consistent color based on user ID
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-orange-500",
      "bg-teal-500",
      "bg-indigo-500",
      "bg-red-500",
    ];
    const index = userId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  if (users.length === 0) {
    return null;
  }

  if (variant === "compact") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="flex items-center gap-2 cursor-pointer">
              <div className="flex items-center -space-x-2">
                {users.slice(0, 3).map((user) => (
                  <div
                    key={user.user_id}
                    className="relative"
                  >
                    <Avatar className="w-6 h-6 border-2 border-background">
                      <AvatarFallback className={`${getAvatarColor(user.user_id)} text-white text-xs`}>
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border-2 border-background rounded-full"></span>
                  </div>
                ))}
              </div>
              <span className="text-xs">
                {users.length} {users.length === 1 ? "viewer" : "viewers"}
              </span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-semibold text-xs mb-2">Currently viewing:</p>
              {users.map((user) => (
                <div key={user.user_id} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>{user.full_name || "Anonymous"}</span>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">
          Active Now ({users.length})
        </h3>
      </div>
      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.user_id} className="flex items-center gap-2">
            <div className="relative">
              <Avatar className="w-8 h-8">
                <AvatarFallback className={`${getAvatarColor(user.user_id)} text-white`}>
                  {getInitials(user.full_name)}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full"></span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.full_name || "Anonymous"}
              </p>
              <p className="text-xs text-muted-foreground">Active now</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
