import { type ReactNode } from "react";
import "./PageHeader.css";

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="page-hdr">
      <div className="page-hdr-main">
        {eyebrow && <p className="page-hdr-eyebrow">{eyebrow}</p>}
        <h2 className="page-hdr-title">{title}</h2>
      </div>
      {(description || actions) && (
        <div className="page-hdr-aside">
          {description && <p className="page-hdr-description">{description}</p>}
          {actions && <div className="page-hdr-actions">{actions}</div>}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
