import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, MessageSquare } from "lucide-react";

const ExploreCard = () => {
  return (
    <Card className="border-delhi-primary/20">
      <CardHeader>
        <CardTitle>Explore</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          <Link to="/community">
            <Button variant="outline">
              <MessageSquare className="mr-2" />
              Community
            </Button>
          </Link>
          <Link to="/leaderboard">
            <Button variant="outline">
              <Trophy className="mr-2" />
              Leaderboard
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExploreCard;
