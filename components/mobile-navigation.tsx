import { bottomItems, isItemActive } from "@/components/navigation-config";
import Link from "next/link";

export function MobileNavigation({
  active,
  inert,
}: {
  active: string;
  inert: boolean;
}) {
  return (
    <nav className="bottom" aria-label="Navigasi utama" inert={inert ? true : undefined}>
      {bottomItems.map(([label, href, Icon]) => {
        const isCurrent = isItemActive(label, active);
        return (
          <Link
            key={label}
            className={isCurrent ? "active" : ""}
            href={href}
            aria-current={isCurrent ? "page" : undefined}
          >
            <Icon />
            <small>{label}</small>
          </Link>
        );
      })}
    </nav>
  );
}
