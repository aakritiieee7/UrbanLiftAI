import Navbar from "@/components/Navbar";
import { Helmet } from "react-helmet-async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Users } from "lucide-react";
import Chatroom from "@/components/community/Chatroom";
import Forum from "@/components/community/Forum";

const CarrierCommunity = () => {
  return (
    <>
      <Helmet>
        <title>Carrier Community | UrbanLift.AI</title>
        <meta name="description" content="Join the UrbanLift.AI carrier community to share insights and collaborate." />
        <link rel="canonical" href="/carrier/community" />
      </Helmet>
      <Navbar />
      <main className="min-h-screen bg-background">
        <section className="container mx-auto px-4 py-10">
          <header className="mb-12 text-center relative">
            <div className="absolute inset-0 bg-gradient-to-r from-delhi-orange/10 via-delhi-navy/10 to-delhi-orange/5 rounded-3xl"></div>
            <div className="relative p-8">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-delhi-orange to-delhi-navy flex items-center justify-center">
                  <Users className="h-8 w-8 text-white" />
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text mb-4">
                Carrier Community
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Connect with fellow carriers and logistics professionals. Share insights, collaborate on solutions.
              </p>
            </div>
          </header>
          
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-2 rounded-2xl h-14">
              <TabsTrigger 
                value="chat" 
                className="flex items-center gap-3 rounded-xl text-base data-[state=active]:bg-gradient-to-r data-[state=active]:from-delhi-orange data-[state=active]:to-delhi-navy data-[state=active]:text-white transition-all"
              >
                <MessageCircle className="h-5 w-5" />
                Live Chat
              </TabsTrigger>
              <TabsTrigger 
                value="forum" 
                className="flex items-center gap-3 rounded-xl text-base data-[state=active]:bg-gradient-to-r data-[state=active]:from-delhi-orange data-[state=active]:to-delhi-navy data-[state=active]:text-white transition-all"
              >
                <Users className="h-5 w-5" />
                Discussion Forum
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="chat" className="mt-6">
              <Chatroom />
            </TabsContent>
            
            <TabsContent value="forum" className="mt-6">
              <Forum />
            </TabsContent>
          </Tabs>
        </section>
      </main>
    </>
  );
};

export default CarrierCommunity;
