import { Sparkles } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AiSummaryCard() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          AI Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          AI-generated summaries aren&apos;t available yet.
        </p>
      </CardContent>
      <CardFooter>
        <Button className="w-full" disabled>
          <Sparkles className="h-4 w-4" />
          Coming soon
        </Button>
      </CardFooter>
    </Card>
  );
}
