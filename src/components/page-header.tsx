import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, icon, action }: PageHeaderProps) {
  const heading = <h1 className="text-2xl font-bold tracking-tight">{title}</h1>;

  if (action) {
    // With action: root has justify-between; left group wraps icon (optional) + heading
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon}
          {heading}
        </div>
        {action}
      </div>
    );
  }

  // Without action
  if (icon) {
    // With icon: left group wraps icon + heading, description below
    return (
      <div>
        <div className="flex items-center gap-3">
          {icon}
          {heading}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    );
  }

  // No action, no icon: heading is direct child, description below
  return (
    <div>
      {heading}
      {description && (
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  );
}
