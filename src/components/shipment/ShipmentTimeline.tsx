import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Clock, Package, Sparkles, UserCheck, Truck, CheckCircle, 
  ChevronDown, ChevronUp, MapPin, AlertCircle 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ShipmentEvent {
  id: string;
  shipment_id: string;
  event_type: string;
  event_title: string;
  event_description: string;
  created_at: string;
  metadata: any;
}

interface ShipmentTimelineProps {
  shipmentId: string;
}

export const ShipmentTimeline = ({ shipmentId }: ShipmentTimelineProps) => {
  const [events, setEvents] = useState<ShipmentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("shipment_events")
      .select("*")
      .eq("shipment_id", shipmentId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching shipment events:", error);
    } else {
      setEvents((data as ShipmentEvent[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (shipmentId) {
      fetchEvents();
    }
  }, [shipmentId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-xs text-muted-foreground font-medium">Loading timeline events...</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/10 rounded-lg border border-dashed border-primary/10">
        <AlertCircle className="h-6 w-6 text-muted-foreground animate-pulse" />
        <p className="text-sm font-medium text-foreground">No events logged yet</p>
        <p className="text-xs text-muted-foreground px-4 max-w-[280px]">
          Timeline updates will appear here as the shipment moves through its lifecycle.
        </p>
      </div>
    );
  }

  const getEventStyles = (type: string) => {
    switch (type) {
      case "created":
        return {
          icon: Package,
          bg: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
          border: "border-slate-200 dark:border-slate-700",
          dotColor: "bg-slate-400"
        };
      case "recommended":
        return {
          icon: Sparkles,
          bg: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400",
          border: "border-indigo-100 dark:border-indigo-950/50",
          dotColor: "bg-indigo-500"
        };
      case "assigned":
        return {
          icon: UserCheck,
          bg: "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400",
          border: "border-amber-100 dark:border-amber-950/50",
          dotColor: "bg-amber-500"
        };
      case "in_transit":
        return {
          icon: Truck,
          bg: "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400",
          border: "border-blue-100 dark:border-blue-950/50",
          dotColor: "bg-blue-500"
        };
      case "delivered":
        return {
          icon: CheckCircle,
          bg: "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400",
          border: "border-green-100 dark:border-green-950/50",
          dotColor: "bg-green-500"
        };
      default:
        return {
          icon: Clock,
          bg: "bg-slate-50 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300",
          border: "border-slate-100 dark:border-slate-800",
          dotColor: "bg-slate-400"
        };
    }
  };

  const toggleExpand = (eventId: string) => {
    setExpandedEventId(expandedEventId === eventId ? null : eventId);
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-green-500 before:via-blue-500 before:to-slate-300 dark:before:from-green-500/55 dark:before:via-blue-500/55 dark:before:to-slate-700/55">
      {events.map((event) => {
        const styles = getEventStyles(event.event_type);
        const IconComponent = styles.icon;
        const eventDate = new Date(event.created_at);
        const formattedTime = eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const formattedDate = eventDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
        
        // Check for metadata
        const hasMetadata = event.metadata && typeof event.metadata === 'object' && Object.keys(event.metadata).length > 0;
        
        // Handle recommendations event
        const recList = hasMetadata && event.metadata.recommendations ? event.metadata.recommendations : null;
        const isAIRecommendation = event.event_type === "recommended" && Array.isArray(recList);
        
        return (
          <div key={event.id} className="relative group">
            {/* Timeline Dot Indicator */}
            <div className="absolute -left-[22px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-background bg-card shadow-sm">
              <div className={`h-2 w-2 rounded-full ${styles.dotColor} group-hover:scale-125 transition-transform duration-200`} />
            </div>

            {/* Event Card */}
            <div className={`rounded-xl border ${styles.border} bg-card/60 backdrop-blur-sm p-4 shadow-sm hover:shadow-md transition-all duration-300`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`rounded-lg p-2 ${styles.bg}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground leading-tight">
                      {event.event_title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {event.event_description}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold text-foreground block">
                    {formattedTime}
                  </span>
                  <span className="text-[9px] text-muted-foreground block font-medium">
                    {formattedDate}
                  </span>
                </div>
              </div>

              {/* Metadata Display / Collapsible for AI Matching Logs */}
              {hasMetadata && (
                <div className="mt-3 pt-3 border-t border-dashed border-primary/10">
                  {isAIRecommendation ? (
                    <div className="space-y-2">
                      <button 
                        onClick={() => toggleExpand(event.id)}
                        className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                      >
                        {expandedEventId === event.id ? (
                          <>
                            <ChevronUp className="h-3.5 w-3.5" />
                            Hide AI Decision Logs
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3.5 w-3.5" />
                            Expand AI Decision Logs
                          </>
                        )}
                      </button>

                      {expandedEventId === event.id && (
                        <div className="mt-2 text-xs space-y-2 bg-indigo-50/30 dark:bg-indigo-950/10 rounded-lg p-2.5 border border-indigo-100/50 dark:border-indigo-950/50">
                          <div className="font-bold text-[9px] text-indigo-800 dark:text-indigo-300 uppercase tracking-wider mb-1">
                            Ranked Recommended Carriers
                          </div>
                          <div className="space-y-2 divide-y divide-indigo-100/20 dark:divide-indigo-950/20">
                            {recList.map((rec: any, idx: number) => {
                              const matchScore = rec.score !== undefined ? rec.score : rec.match_score;
                              const pct = Math.round(matchScore * 100);
                              return (
                                <div key={idx} className="pt-2 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                  <div className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                                    <span className="text-[9px] bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-1 py-0.2 rounded font-extrabold">
                                      #{idx + 1}
                                    </span>
                                    {rec.carrier_name}
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground text-[10px]">
                                    <Badge variant="outline" className="text-[9px] border-indigo-200 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/20 px-1 py-0 h-4">
                                      {pct}% Match
                                    </Badge>
                                    <span className="italic max-w-[180px] sm:max-w-[220px] truncate" title={rec.reason}>
                                      {rec.reason}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : event.event_type === "assigned" ? (
                    <div className="text-xs space-y-1 bg-amber-50/30 dark:bg-amber-950/10 rounded-lg p-2.5 border border-amber-100/50 dark:border-amber-950/50">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Assigned Carrier:</span>
                        <span className="font-semibold text-foreground">{event.metadata.carrier_name || "Driver"}</span>
                      </div>
                      {event.metadata.final_cost && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Final Pricing:</span>
                          <span className="font-bold text-amber-700 dark:text-amber-400">₹{event.metadata.final_cost}</span>
                        </div>
                      )}
                    </div>
                  ) : event.event_type === "created" ? (
                    <div className="text-xs space-y-1 bg-slate-50/50 dark:bg-slate-900/20 rounded-lg p-2.5 border border-slate-100/50 dark:border-slate-800">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground shrink-0">Route:</span>
                        <span className="font-medium text-foreground text-right truncate max-w-[250px]" title={`${event.metadata.origin} to ${event.metadata.destination}`}>
                          {event.metadata.origin} → {event.metadata.destination}
                        </span>
                      </div>
                      {event.metadata.weight_kg && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Weight:</span>
                          <span className="font-medium text-foreground">{event.metadata.weight_kg} kg</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted-foreground bg-slate-50/30 dark:bg-slate-900/5 p-2 rounded border border-slate-100/50 dark:border-slate-800 flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-primary shrink-0" />
                      Coordinates: {event.metadata.lat?.toFixed(4)}, {event.metadata.lng?.toFixed(4)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
