import Image from "next/image";
import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" aria-label="AUP Work Scholars home" className="inline-flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <Image src="/aup_logo.png" alt="AUP" width={40} height={40} priority className="h-10 w-10 object-contain" />
      {!compact && <span className="text-[15px] font-semibold leading-tight">AUP Work Scholars</span>}
    </Link>
  );
}
