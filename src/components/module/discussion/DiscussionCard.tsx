import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ThumbsUp, MessageCircle, CheckCircle, ArrowUp, ArrowDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DiscussionCardProps {
  discussion: {
    id: string;
    title: string;
    content: string;
    upvotes: number;
    is_resolved: boolean;
    created_at: string;
    profiles: {
      full_name: string | null;
    };
    _count: {
      replies: number;
    };
    user_upvoted: boolean;
  };
  onUpvote: (id: string) => void;
  onClick: () => void;
}

export const DiscussionCard = ({
  discussion,
  onUpvote,
  onClick,
}: DiscussionCardProps) => {
  const hasAnswers = discussion._count.replies > 0;
  
  return (
    <Card
      className={`p-4 cursor-pointer hover:bg-accent/50 transition-all duration-200 border-l-4 ${
        discussion.is_resolved 
          ? "border-l-success bg-success/5" 
          : "border-l-transparent hover:border-l-primary/50"
      }`}
      onClick={onClick}
    >
      <div className="flex gap-6">
        {/* Stack Overflow-style stats sidebar */}
        <div className="flex flex-col gap-4 text-center min-w-[80px] py-2">
          <div 
            className="flex flex-col items-center cursor-pointer hover:bg-accent rounded-md p-2 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onUpvote(discussion.id);
            }}
          >
            <ArrowUp 
              className={`w-5 h-5 mb-1 ${
                discussion.user_upvoted ? "text-primary fill-primary" : "text-muted-foreground"
              }`}
            />
            <span className={`text-xl font-bold ${
              discussion.upvotes > 0 ? "text-foreground" : "text-muted-foreground"
            }`}>
              {discussion.upvotes}
            </span>
            <ArrowDown className="w-5 h-5 mt-1 text-muted-foreground opacity-50" />
          </div>
          
          <div className={`flex flex-col items-center p-2 rounded-md ${
            hasAnswers ? "bg-primary/10" : ""
          }`}>
            {discussion.is_resolved && (
              <CheckCircle className="w-4 h-4 text-success mb-1" />
            )}
            <MessageCircle className={`w-5 h-5 mb-1 ${
              hasAnswers ? "text-primary" : "text-muted-foreground"
            }`} />
            <span className={`text-lg font-semibold ${
              hasAnswers ? "text-foreground" : "text-muted-foreground"
            }`}>
              {discussion._count.replies}
            </span>
            <span className="text-xs text-muted-foreground">
              {discussion._count.replies === 1 ? "answer" : "answers"}
            </span>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-lg font-semibold hover:text-primary transition-colors">
              {discussion.title}
            </h3>
            {discussion.is_resolved && (
              <Badge
                variant="default"
                className="flex items-center gap-1 bg-success shrink-0"
              >
                <CheckCircle className="w-3 h-3" />
                Solved
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2">
            {discussion.content}
          </p>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                asked {formatDistanceToNow(new Date(discussion.created_at), {
                  addSuffix: true,
                })}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">by</span>
              <span className="font-medium text-foreground">
                {discussion.profiles.full_name || "Anonymous"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
