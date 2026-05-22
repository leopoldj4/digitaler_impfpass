import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface Crumb {
  label: string;
  href?: string;
}

interface TopBarProps {
  crumbs: Crumb[];
  actions?: React.ReactNode;
}

export function TopBar({ crumbs, actions }: TopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card/80 px-4 backdrop-blur-sm">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb className="flex-1">
        <BreadcrumbList>
          {crumbs.map((crumb, i) => (
            <Fragment key={i}>
              <BreadcrumbItem>
                {i < crumbs.length - 1 ? (
                  <BreadcrumbLink href={crumb.href ?? "#"}>{crumb.label}</BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {i < crumbs.length - 1 && <BreadcrumbSeparator />}
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
