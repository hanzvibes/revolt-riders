import type { ReactNode } from "react";

type PageStateTone = "neutral" | "error" | "restricted";

type PageStateProps = {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  tone?: PageStateTone;
  compact?: boolean;
  className?: string;
};

export function PageState({
  icon,
  title,
  description,
  action,
  tone = "neutral",
  compact = false,
  className = "",
}: PageStateProps) {
  const classes = [
    "page-state",
    "card",
    `page-state-${tone}`,
    compact ? "page-state-compact" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <section className={classes} role={tone === "error" ? "alert" : undefined}>
      {icon ? (
        <div className="page-state-icon" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <div className="page-state-copy">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="page-state-action">{action}</div> : null}
    </section>
  );
}
