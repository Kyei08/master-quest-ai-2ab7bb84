import { Star, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface QualityRatingDisplayProps {
  averageRating: number | null;
  totalRatings: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export const QualityRatingDisplay = ({
  averageRating,
  totalRatings,
  size = "md",
  showLabel = true,
}: QualityRatingDisplayProps) => {
  if (!averageRating || totalRatings === 0) {
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Star className="w-3 h-3" />
        <span className="text-xs">Not rated</span>
      </Badge>
    );
  }

  const getQualityLevel = (rating: number) => {
    if (rating >= 4.5) return { label: "Excellent", color: "text-green-600", icon: TrendingUp };
    if (rating >= 3.5) return { label: "Good", color: "text-blue-600", icon: TrendingUp };
    if (rating >= 2.5) return { label: "Fair", color: "text-yellow-600", icon: Minus };
    return { label: "Needs Review", color: "text-red-600", icon: TrendingDown };
  };

  const quality = getQualityLevel(averageRating);
  const QualityIcon = quality.icon;

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const starSizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <div className="flex items-center gap-2">
      {/* Star rating display */}
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`${starSizeClasses[size]} ${
              i < Math.round(averageRating)
                ? "fill-primary text-primary"
                : "text-muted-foreground opacity-30"
            }`}
          />
        ))}
      </div>

      {/* Rating value and count */}
      <div className={`flex items-center gap-2 ${sizeClasses[size]}`}>
        <span className="font-bold">{averageRating.toFixed(1)}</span>
        <span className="text-muted-foreground">({totalRatings})</span>
      </div>

      {/* Quality indicator */}
      {showLabel && (
        <Badge variant="outline" className={`flex items-center gap-1 ${quality.color}`}>
          <QualityIcon className="w-3 h-3" />
          {quality.label}
        </Badge>
      )}
    </div>
  );
};
