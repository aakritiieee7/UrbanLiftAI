import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Truck, Users, Bell, Check, Trash2, Inbox } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Navbar = memo(() => {
  const { userId, role } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setNotifications(data);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();

    const handleDbChange = () => {
      fetchNotifications();
    };
    window.addEventListener('mock-database-change', handleDbChange);
    const interval = setInterval(fetchNotifications, 5000);

    return () => {
      window.removeEventListener('mock-database-change', handleDbChange);
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  const markAllAsRead = async () => {
    if (!userId) return;
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId);
    if (!error) {
      fetchNotifications();
      window.dispatchEvent(new Event('mock-database-change'));
    }
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    if (!error) {
      fetchNotifications();
      window.dispatchEvent(new Event('mock-database-change'));
    }
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
    if (!error) {
      fetchNotifications();
      window.dispatchEvent(new Event('mock-database-change'));
    }
  };

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    navigate("/");
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="inline-flex items-center gap-2 font-semibold hover:opacity-90 transition-opacity">
          <Truck className="h-6 w-6" aria-hidden="true" />
          <span className="text-base md:text-lg font-semibold">UrbanLift.AI</span>
        </Link>
        <div className="flex items-center gap-4">
          {userId && (
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative hover:bg-accent rounded-full h-9 w-9"
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                aria-label="Toggle notifications"
              >
                <Bell className="h-4.5 w-4.5 text-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-destructive text-[9px] font-extrabold text-white ring-2 ring-background">
                    {unreadCount}
                  </span>
                )}
              </Button>

              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[480px] overflow-y-auto z-50 rounded-xl border border-border bg-background/95 backdrop-blur shadow-2xl p-4">
                  <div className="flex items-center justify-between border-b pb-2 mb-2">
                    <span className="font-bold text-xs text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      🔔 Notifications
                    </span>
                    {unreadCount > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-[10px] text-primary font-bold hover:bg-primary/5 px-2"
                        onClick={markAllAsRead}
                      >
                        Mark all read
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2 py-1">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Inbox className="h-8 w-8 text-muted-foreground/45 mb-2" />
                        <p className="text-xs text-muted-foreground font-semibold">All caught up!</p>
                        <p className="text-[10px] text-muted-foreground/75 mt-0.5">No notifications yet.</p>
                      </div>
                    ) : (
                      notifications.map(notif => {
                        const notifDate = notif.created_at ? new Date(notif.created_at) : new Date();
                        const timeStr = isNaN(notifDate.getTime()) 
                          ? 'Just now' 
                          : Math.floor((Date.now() - notifDate.getTime()) / 60000) < 1 
                            ? 'Just now' 
                            : Math.floor((Date.now() - notifDate.getTime()) / 60000) < 60 
                              ? `${Math.floor((Date.now() - notifDate.getTime()) / 60000)}m ago` 
                              : Math.floor((Date.now() - notifDate.getTime()) / 3600000) < 24 
                                ? `${Math.floor((Date.now() - notifDate.getTime()) / 3600000)}h ago` 
                                : notifDate.toLocaleDateString();

                        return (
                          <div 
                            key={notif.id}
                            onClick={() => {
                              markAsRead(notif.id);
                              setShowNotifDropdown(false);
                              if (notif.shipment_id) {
                                navigate(`/${role}/track?id=${notif.shipment_id}`);
                              }
                            }}
                            className={`flex gap-3 p-3 rounded-lg border transition-all duration-150 cursor-pointer ${
                              notif.read 
                                ? 'bg-background hover:bg-accent border-border/40' 
                                : 'bg-primary/5 hover:bg-primary/10 border-primary/20 shadow-sm'
                            }`}
                          >
                            <div className="text-lg shrink-0 pt-0.5">
                              {notif.type === 'assigned' ? '📦' : notif.type === 'transit_started' || notif.type === 'in_transit' ? '🚛' : notif.type === 'delivered' ? '🎉' : '📝'}
                            </div>
                            <div className="flex-1 space-y-0.5 min-w-0">
                              <div className="flex items-start justify-between gap-1">
                                <p className={`text-xs font-bold text-foreground leading-tight ${!notif.read && 'text-primary'}`}>
                                  {notif.title}
                                </p>
                                <span className="text-[9px] text-muted-foreground shrink-0 font-medium">{timeStr}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground leading-normal font-medium break-words">
                                {notif.message}
                              </p>
                              {!notif.read && (
                                <div className="flex justify-end pt-1">
                                  <span className="text-[9px] font-bold text-primary flex items-center gap-0.5">
                                    <Check className="h-3 w-3" /> Mark read
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col justify-between shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                                onClick={(e) => deleteNotification(notif.id, e)}
                                aria-label="Delete notification"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            {userId && role === 'shipper' ? (
              <>
                <NavLink to="/shipper/home" className="px-3 py-2 rounded-md hover:bg-accent text-sm font-medium">
                  Home
                </NavLink>
                <NavLink to="/shipper/transit" className="px-3 py-2 rounded-md hover:bg-accent text-sm font-medium">
                  Transit
                </NavLink>
                <NavLink to="/shipper/track" className="px-3 py-2 rounded-md hover:bg-accent text-sm font-medium">
                  Track
                </NavLink>
                <NavLink to="/shipper/community" className="px-3 py-2 rounded-md hover:bg-accent text-sm font-medium">
                  Community
                </NavLink>
                <NavLink to="/shipper/pooling" className="px-3 py-2 rounded-md hover:bg-accent text-sm font-medium">
                  Pooling
                </NavLink>
                <NavLink to="/shipper/analytics" className="px-3 py-2 rounded-md hover:bg-accent text-sm font-medium">
                  Analytics
                </NavLink>
                <NavLink to="/ops/analytics" className="px-3 py-2 rounded-md hover:bg-accent text-sm font-medium">
                  Ops Dashboard
                </NavLink>
                <Link to="/profile">
                  <Button variant="outline" size="sm">Profile</Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={logout}>Logout</Button>
              </>
            ) : userId && role === 'carrier' ? (
              <>
                <NavLink to="/carrier/home" className="px-3 py-2 rounded-md hover:bg-accent text-sm font-medium">
                  Home
                </NavLink>
                <NavLink to="/carrier/available" className="px-3 py-2 rounded-md hover:bg-accent text-sm font-medium">
                  Available
                </NavLink>
                <NavLink to="/carrier/transit" className="px-3 py-2 rounded-md hover:bg-accent text-sm font-medium">
                  Transit
                </NavLink>
                <NavLink to="/carrier/track" className="px-3 py-2 rounded-md hover:bg-accent text-sm font-medium">
                  Track
                </NavLink>
                <NavLink to="/carrier/community" className="px-3 py-2 rounded-md hover:bg-accent text-sm font-medium">
                  Community
                </NavLink>
                <NavLink to="/carrier/analytics" className="px-3 py-2 rounded-md hover:bg-accent text-sm font-medium">
                  Analytics
                </NavLink>
                <NavLink to="/ops/analytics" className="px-3 py-2 rounded-md hover:bg-accent text-sm font-medium">
                  Ops Dashboard
                </NavLink>
                <Link to="/profile">
                  <Button variant="outline" size="sm">Profile</Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={logout}>Logout</Button>
              </>
            ) : (
              <>
                {userId ? (
                  <>
                    <Link to="/profile">
                      <Button variant="outline" size="sm">Profile</Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={logout}>Logout</Button>
                  </>
                ) : (
                  <>
                    <Link to="/auth/shipper/login">
                      <Button variant="outline" size="sm" className="">
                        <Users className="mr-2 h-4 w-4" /> Shipper Login
                      </Button>
                    </Link>
                    <Link to="/auth/carrier/login">
                      <Button variant="default" size="sm" className="">
                        <Truck className="mr-2 h-4 w-4" /> Carrier Login
                      </Button>
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
});

Navbar.displayName = "Navbar";

export default Navbar;
