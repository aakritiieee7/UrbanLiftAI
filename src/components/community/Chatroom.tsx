
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { MessageCircle, Users, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Chatroom {
  id: string;
  name: string;
  description: string;
  type: "general" | "shipper" | "carrier";
  participants: number;
}

interface Message {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  user_name: string;
}

const Chatroom = () => {
  const { userId, role } = useAuth();
  const { toast } = useToast();
  const [chatrooms, setChatrooms] = useState<Chatroom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChatrooms();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom);
      subscribeToMessages(selectedRoom);
    }
  }, [selectedRoom]);

  const loadChatrooms = async () => {
    try {
      const { data, error } = await supabase
        .from("chatrooms")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform data to match interface
      const rooms: Chatroom[] = (data || []).map(room => ({
        id: room.id,
        name: room.name,
        description: room.description || "",
        type: room.type as "general" | "shipper" | "carrier",
        participants: 0 // We'll calculate this separately if needed
      }));

      setChatrooms(rooms);
    } catch (error) {
      console.error("Error loading chatrooms:", error);
      // Fallback to default rooms if database fails
      setChatrooms([
        {
          id: "1",
          name: "General Discussion",
          description: "General logistics discussions",
          type: "general",
          participants: 24
        },
        {
          id: "2", 
          name: "Delhi Routes",
          description: "Route optimization for Delhi",
          type: "general",
          participants: 18
        },
        {
          id: "3",
          name: "Carrier Network", 
          description: "Carrier coordination hub",
          type: "carrier",
          participants: 12
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("chatroom_id", roomId)
        .order("created_at", { ascending: true })
        .limit(50);

      if (error) throw error;

      // Transform data and get user names
      const messagesWithNames = await Promise.all(
        (data || []).map(async (msg) => {
          let userName = "Unknown User";
          
          // Try to get user name from profiles
          const { data: profile } = await supabase
            .from("shipper_profiles")
            .select("business_name, company_name")
            .eq("user_id", msg.user_id)
            .single();

          if (profile) {
            userName = profile.business_name || profile.company_name || "User";
          } else {
            // Try carrier profiles
            const { data: carrierProfile } = await supabase
              .from("carrier_profiles")
              .select("business_name, company_name")
              .eq("user_id", msg.user_id)
              .single();
            
            if (carrierProfile) {
              userName = carrierProfile.business_name || carrierProfile.company_name || "Carrier";
            }
          }

          return {
            id: msg.id,
            user_id: msg.user_id,
            message: msg.message,
            created_at: msg.created_at,
            user_name: userName
          };
        })
      );

      setMessages(messagesWithNames);
    } catch (error) {
      console.error("Error loading messages:", error);
      setMessages([]);
    }
  };

  const subscribeToMessages = (roomId: string) => {
    const channel = supabase
      .channel(`chatroom-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chatroom_id=eq.${roomId}`
        },
        () => {
          loadMessages(roomId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom || !userId) {
      if (!userId) {
        toast({ title: "Please log in to send messages" });
      }
      return;
    }
    
    try {
      const { error } = await supabase
        .from("chat_messages")
        .insert({
          chatroom_id: selectedRoom,
          user_id: userId,
          message: newMessage.trim()
        });

      if (error) throw error;

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({ title: "Failed to send message", description: "Please try again" });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading chatrooms...</div>;
  }

  if (!selectedRoom) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold">Community Chatrooms</h3>
          <p className="text-muted-foreground">Connect with other logistics professionals</p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {chatrooms.map((room) => (
            <Card key={room.id} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedRoom(room.id)}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{room.name}</CardTitle>
                  <Badge variant={room.type === "general" ? "default" : "secondary"}>
                    {room.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{room.description}</p>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4" />
                  <span>{room.participants} participants</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const currentRoom = chatrooms.find(room => room.id === selectedRoom);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => setSelectedRoom(null)}>
          ← Back to Rooms
        </Button>
        <div>
          <h3 className="text-xl font-semibold">{currentRoom?.name}</h3>
          <p className="text-sm text-muted-foreground">{currentRoom?.description}</p>
        </div>
      </div>

      <Card className="h-96 flex flex-col">
        <CardContent className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{message.user_name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{message.user_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm">{message.message}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            />
            <Button onClick={sendMessage} disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Chatroom;
