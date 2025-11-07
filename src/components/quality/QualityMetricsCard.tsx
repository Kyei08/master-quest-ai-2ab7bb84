import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";

interface QualityMetricsCardProps {
  metrics: {
    total: number;
    averageRating: number;
    excellent: number;
    good: number;
    fair: number;
    poor: number;
    flagged: number;
    approved: number;
  };
}

export const QualityMetricsCard = ({ metrics }: QualityMetricsCardProps) => {
  const qualityDistribution = [
    { label: "Excellent (4.5+)", count: metrics.excellent, color: "bg-green-500" },
    { label: "Good (3.5-4.4)", count: metrics.good, color: "bg-blue-500" },
    { label: "Fair (2.5-3.4)", count: metrics.fair, color: "bg-yellow-500" },
    { label: "Poor (<2.5)", count: metrics.poor, color: "bg-red-500" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-primary" />
          Content Quality Overview
        </CardTitle>
        <CardDescription>Aggregate quality metrics across all content</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Content</p>
            <p className="text-2xl font-bold">{metrics.total}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Avg Rating</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{metrics.averageRating.toFixed(1)}</p>
              <Star className="w-4 h-4 fill-primary text-primary" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Approved</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-green-600">{metrics.approved}</p>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Flagged</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-red-600">{metrics.flagged}</p>
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
          </div>
        </div>

        {/* Quality Distribution */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Quality Distribution</h4>
          {qualityDistribution.map((item) => {
            const percentage = metrics.total > 0 ? (item.count / metrics.total) * 100 : 0;
            return (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">
                    {item.count} ({percentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Health Indicator */}
        <div className="flex items-center gap-3 p-4 bg-accent/50 rounded-lg">
          {metrics.averageRating >= 3.5 ? (
            <>
              <TrendingUp className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <p className="font-medium text-sm">Content Quality is Good</p>
                <p className="text-xs text-muted-foreground">
                  Overall content is meeting quality standards
                </p>
              </div>
            </>
          ) : (
            <>
              <TrendingDown className="w-5 h-5 text-yellow-600" />
              <div className="flex-1">
                <p className="font-medium text-sm">Review Required</p>
                <p className="text-xs text-muted-foreground">
                  Some content needs attention to improve quality
                </p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
