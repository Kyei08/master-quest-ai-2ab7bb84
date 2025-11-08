import { Activity, AlertTriangle, CheckCircle2, Clock, Radio, XCircle, Wifi, WifiOff, Signal, RotateCw } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useConnectionQuality } from "@/hooks/useConnectionQuality";

interface QueueItem {
  id: string;
  moduleId: string;
  draftType: "assignment" | "quiz" | "flashcards" | "presentations";
  quizType?: "quiz" | "final_test";
  data: any;
  timestamp: number;
  retryCount: number;
  nextRetryAt: number;
  lastSyncAttempt?: number;
}

interface SyncStatusDashboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queueItems: QueueItem[];
  syncStats: { success: number; failed: number; total: number };
  lastBatchSync: Date | null;
  registeredCount: number;
  syncing: boolean;
  onRetryItem: (itemId: string) => void;
}

export const SyncStatusDashboard = ({
  open,
  onOpenChange,
  queueItems,
  syncStats,
  lastBatchSync,
  registeredCount,
  syncing,
  onRetryItem,
}: SyncStatusDashboardProps) => {
  const connectionQuality = useConnectionQuality();

  const formatTabName = (item: QueueItem) => {
    if (item.draftType === "quiz") {
      return item.quizType === "final_test" ? "Final Test" : "Quiz";
    }
    return item.draftType.charAt(0).toUpperCase() + item.draftType.slice(1);
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const formatNextRetry = (nextRetryAt: number) => {
    const seconds = Math.ceil((nextRetryAt - Date.now()) / 1000);
    if (seconds <= 0) return "retrying now";
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.ceil(seconds / 60);
    return `${minutes}m`;
  };

  const successRate = syncStats.total > 0 
    ? Math.round((syncStats.success / syncStats.total) * 100) 
    : 100;

  const getConnectionIcon = () => {
    switch (connectionQuality.status) {
      case "excellent":
        return <Wifi className="w-4 h-4 text-success" />;
      case "good":
        return <Signal className="w-4 h-4 text-success" />;
      case "poor":
        return <Signal className="w-4 h-4 text-warning" />;
      case "offline":
        return <WifiOff className="w-4 h-4 text-destructive" />;
    }
  };

  const getConnectionBadgeVariant = () => {
    switch (connectionQuality.status) {
      case "excellent":
      case "good":
        return "default" as const;
      case "poor":
        return "secondary" as const;
      case "offline":
        return "destructive" as const;
    }
  };

  // Group queue items by tab
  const groupedItems = queueItems.reduce((acc, item) => {
    const tabName = formatTabName(item);
    if (!acc[tabName]) acc[tabName] = [];
    acc[tabName].push(item);
    return acc;
  }, {} as Record<string, QueueItem[]>);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Sync Status
          </SheetTitle>
          <SheetDescription>
            Real-time sync monitoring and statistics
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
          <div className="space-y-4 pr-4">
            {/* Connection Quality */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {getConnectionIcon()}
                  Internet Connection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Quality</span>
                  <Badge variant={getConnectionBadgeVariant()}>
                    {connectionQuality.status.charAt(0).toUpperCase() + connectionQuality.status.slice(1)}
                  </Badge>
                </div>
                
                {connectionQuality.latency !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Response Time</span>
                    <span className={cn(
                      "text-sm font-medium",
                      connectionQuality.latency > 2000 && "text-destructive",
                      connectionQuality.latency > 1000 && connectionQuality.latency <= 2000 && "text-warning"
                    )}>
                      {connectionQuality.latency}ms
                    </span>
                  </div>
                )}

                {connectionQuality.errorDetails && (
                  <div className="p-2 rounded-md bg-destructive/10 border border-destructive/20">
                    <p className="text-xs text-destructive font-medium mb-1">
                      {connectionQuality.errorDetails.includes("Server error") ? "⚠️ Server Issue" : "📡 Connection Issue"}
                    </p>
                    <p className="text-xs text-muted-foreground break-words">
                      {connectionQuality.errorDetails}
                    </p>
                  </div>
                )}

                {connectionQuality.lastChecked && (
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    Last checked: {connectionQuality.lastChecked.toLocaleTimeString()}
                  </div>
                )}

                {syncing && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1 pt-2 border-t">
                    <Clock className="w-3 h-3 animate-spin" />
                    Syncing in progress...
                  </div>
                )}

                {/* Diagnosis Help */}
                {syncStats.failed > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium mb-1">💡 Troubleshooting:</p>
                    {connectionQuality.status === "offline" || connectionQuality.status === "poor" ? (
                      <p className="text-xs text-muted-foreground">
                        Your internet connection is {connectionQuality.status}. Try moving closer to your router or switching to a better network.
                      </p>
                    ) : connectionQuality.errorDetails?.includes("Server error") ? (
                      <p className="text-xs text-muted-foreground">
                        Server is experiencing issues. Your changes are safely queued and will sync automatically when the server recovers.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Internet is working fine. Check the error details in pending changes below.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sync Statistics */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Sync Statistics</CardTitle>
                <CardDescription className="text-xs">
                  Overall performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Success Rate</span>
                    <span className="font-medium">{successRate}%</span>
                  </div>
                  <Progress value={successRate} className="h-2" />
                </div>
                
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Total</div>
                    <div className="text-lg font-bold">{syncStats.total}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-success flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Success
                    </div>
                    <div className="text-lg font-bold text-success">{syncStats.success}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-destructive flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      Failed
                    </div>
                    <div className="text-lg font-bold text-destructive">{syncStats.failed}</div>
                  </div>
                </div>

                {lastBatchSync && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Last Sync</span>
                      <span>{lastBatchSync.toLocaleTimeString()}</span>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Active Tabs</span>
                    <span className="font-medium">{registeredCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending Changes by Tab */}
            {queueItems.length > 0 ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    Pending Changes ({queueItems.length})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Changes waiting to sync
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(groupedItems).map(([tabName, items]) => (
                      <div key={tabName} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{tabName}</span>
                          <Badge variant="secondary" className="text-xs">
                            {items.length} {items.length === 1 ? 'change' : 'changes'}
                          </Badge>
                        </div>
                        {items.map((item) => (
                          <div key={item.id} className="pl-3 border-l-2 border-muted space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Queued</span>
                              <span>{formatTimeAgo(item.timestamp)}</span>
                            </div>
                            {item.retryCount > 0 && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-warning">Retry #{item.retryCount}</span>
                                <span className="text-muted-foreground">
                                  Next: {formatNextRetry(item.nextRetryAt)}
                                </span>
                              </div>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full h-7 text-xs"
                              onClick={() => onRetryItem(item.id)}
                              disabled={syncing}
                            >
                              <RotateCw className={cn("w-3 h-3 mr-1", syncing && "animate-spin")} />
                              Retry Now
                            </Button>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-6">
                    <CheckCircle2 className="w-12 h-12 mx-auto text-success mb-2 opacity-50" />
                    <p className="text-sm font-medium">All Changes Synced</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      No pending changes in queue
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
