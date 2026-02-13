"use client";

import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    <header className="w-full bg-[#FAFAFA] border-b">
      <div className="max-w-7xl mx-auto flex items-center justify-between py-4 px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/YoungEngineerLogo.png" // ← replace with your logo
            alt="Young Engineers Logo"
            width={160}
            height={52}
            priority
          />
        </Link>

        {/* Menu */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="/programs"
            className="text-[#0097DC] text-xs font-bold uppercase tracking-wide hover:opacity-70"
          >
            Programs
          </Link>

          <Link
            href="/workshops"
            className="text-[#0097DC] text-xs uppercase tracking-wide hover:opacity-70"
          >
            Workshops
          </Link>

          <Link
            href="/class-registration"
            className="text-[#0097DC] text-xs uppercase tracking-wide hover:opacity-70"
          >
            Class Registration
          </Link>

          <Link
            href="/worldwide"
            className="text-[#0097DC] text-xs uppercase tracking-wide hover:opacity-70"
          >
            Worldwide Site
          </Link>

          <Link
            href="/student-zone"
            className="text-[#0097DC] text-xs uppercase tracking-wide hover:opacity-70"
          >
            Student Zone
          </Link>
        </nav>

        {/* Icons */}
        <div className="flex items-center gap-4">
          <Image
            src="/uk-flag.png" // replace with your flag icon
            alt="Language"
            width={28}
            height={28}
          />

          <Link href="https://wa.me/your_whatsapp_number" target="_blank">
            <Image
              src="/whatsapp.png" // replace with whatsapp icon
              alt="WhatsApp"
              width={33}
              height={33}
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
