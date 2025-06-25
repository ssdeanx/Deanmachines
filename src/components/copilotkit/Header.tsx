"use client";

import { HeaderProps, useChatContext } from "@copilotkit/react-ui";
import { BookOpen, Home, Settings, Search, GitBranch, Users, Zap, Code2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import "@copilotkit/react-ui/styles.css";

const navItems = [
  { href: "/playground", label: "Home", icon: Home },
  { href: "/playground/settings", label: "Settings", icon: Settings },
  { href: "/playground/research", label: "Research", icon: Search },
  { href: "/playground/codegraph", label: "Code Graph", icon: GitBranch },
  { href: "/playground/multi-agent", label: "Multi-Agent", icon: Users },
  { href: "/playground/actions", label: "Actions", icon: Zap },
  { href: "/playground/generative-ui", label: "Generative UI", icon: Code2 },
];

export function Header({ }: HeaderProps) {
  const { setOpen, icons, labels } = useChatContext();
  const pathname = usePathname();
  return (
    <header className="bg-background border-b border-border">
      <div className="flex justify-between items-center p-4">
        <div className="w-24">
          <Link href="/">
            <BookOpen className="w-6 h-6 text-foreground" />
          </Link>
        </div>
        <div className="text-lg font-semibold text-foreground">{labels.title}</div>
        <div className="w-24 flex justify-end">
          <button 
            onClick={() => setOpen(false)} 
            aria-label="Close"
            className="text-foreground hover:text-muted-foreground transition-colors"
          >
            {icons.headerCloseIcon}
          </button>
        </div>
      </div>
      <nav className="flex flex-wrap gap-2 px-4 pb-4 bg-muted/50">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "bg-background text-foreground hover:bg-muted hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
// Generated on 2025-06-13 [BY: GitHub Copilot]
