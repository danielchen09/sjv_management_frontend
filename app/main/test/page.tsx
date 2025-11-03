'use client';

import { Button } from "@/components/button";
import { createClient } from "@/utils/supabase/client";

const handleTestAction = async () => {
  const supabase = createClient();
  const {data, error} = await supabase.functions.invoke('create_user', {
    body: {
      email: 'test@example.com'
    },
  });
  if (error) {
    console.error('Error invoking function:', error);
  }
  else {
    console.log('Function response data:', data);
  }
};

export default function TestPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1>Test Page</h1>
        <p className="text-muted-foreground">
          Press the button to invoke the test action. Check the browser console for output.
        </p>
      </div>
      <Button onClick={handleTestAction}>
        Run Test Function
      </Button>
    </div>
  );
}
