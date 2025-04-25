import Image from "next/image";
import hawks_logo from "@/public/hawks/logo.png";
import hawks_typescript from "@/public/hawks/typescript.png";

export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-2 justify-center">
          <div className="relative w-[200px]">
            <Image
              src={hawks_logo}
              alt="Logo of ASIMOV-HAWKS"
              objectFit="contain"
              style={{ width: "100%", height: "auto" }}
            />
          </div>
          <div className="relative w-[200px]">
            <Image
              src={hawks_typescript}
              alt="Typescript of ASIMOV-HAWKS"
              objectFit="contain"
              style={{ width: "100%", height: "auto" }}
            />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
