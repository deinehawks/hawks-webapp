import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col h-svh w-full gap-1 items-center justify-center">
      <div className="font-bold text-2xl"> Page Not Found </div>
      <Link href={"/"}>
        <Button variant="link"> Return to Homepage </Button>
      </Link>
    </div>
  );
}
