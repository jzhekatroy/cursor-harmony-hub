// Update this page (the content is just a fallback if you fail to update the page)

import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="mb-4 text-4xl font-bold">Beauty Booking System</h1>
        <p className="text-xl text-muted-foreground">Система записи на бьюти-услуги</p>
        <div className="flex gap-4 justify-center">
          <Button asChild>
            <Link to="/book/demo">Демо запись</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
