import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative bg-cover bg-top bg-norepeat h-[699px] flex flex-col w-full overflow-hidden">
      {/* Background Image */}
      <Image
        src="/children.png"
        alt="Kids learning robotics"
        fill
        className="object-cover brightness-[0.75]"
        priority
      />

      {/* Content */}
      <div className="absolute left-[120px] top-[200px] flex flex-col gap-6 w-[360px]">
        {/* Official Badge */}
        <Image
          src="/officially-recognized.png"
          alt="Officially Recognized"
          width={120}
          height={70}
          className="drop-shadow-lg"
        />

        {/* Welcome text */}
        <p className="text-[#FAC901] uppercase font-bold tracking-wide text-[18px]">
          Welcome to YE [Territory Name]
        </p>

        {/* Title */}
        <h1 className="text-white uppercase font-bold text-[32px] leading-tight tracking-wide">
          Engineering Thinking & Creativity Space
        </h1>

        {/* Button */}
        <Link
          href="/programs"
          className="flex items-center justify-center gap-3 bg-[#0097DC] rounded-full py-4 px-6 hover:bg-[#007ab3] transition-all w-full"
        >
          <Image src="/gear.png" alt="Gear" width={26} height={26} />
          <span className="text-white text-[20px] tracking-wide uppercase font-semibold">
            Discover Programs
          </span>
        </Link>
      </div>
    </section>
  );
}
