import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Route, TrendingUp, Zap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const RouteOptimizerCard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:border-primary/30 transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Route className="h-5 w-5 text-primary" />
          </div>
          AI Route Optimizer
        </CardTitle>
        <CardDescription>
          Advanced shipment pooling and route optimization using machine learning algorithms
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-white/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-sm font-semibold text-green-600">
              <TrendingUp className="h-4 w-4" />
              85% Efficiency
            </div>
            <div className="text-xs text-muted-foreground">Average Optimization</div>
          </div>
          <div className="text-center p-3 bg-white/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-sm font-semibold text-blue-600">
              <Zap className="h-4 w-4" />
              Real-time
            </div>
            <div className="text-xs text-muted-foreground">Processing</div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Key Features:</h4>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">Smart Pooling</Badge>
            <Badge variant="secondary" className="text-xs">AI Clustering</Badge>
            <Badge variant="secondary" className="text-xs">Route Planning</Badge>
            <Badge variant="secondary" className="text-xs">Cost Optimization</Badge>
          </div>
        </div>

        <div className="bg-white/30 rounded-lg p-3 border border-primary/20">
          <div className="text-sm text-muted-foreground mb-2">Benefits:</div>
          <ul className="text-xs space-y-1 text-muted-foreground">
            <li>• Reduce total delivery routes by up to 60%</li>
            <li>• Optimize shipment pooling automatically</li>
            <li>• Minimize fuel costs and delivery time</li>
            <li>• AI-powered clustering algorithms</li>
          </ul>
        </div>

        <Button 
          onClick={() => navigate('/route-optimization')}
          className="w-full bg-primary hover:bg-primary/90"
        >
          Launch AI Optimizer
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};