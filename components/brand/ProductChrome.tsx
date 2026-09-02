import type { ReactNode } from "react";
import { BrandLogo } from "./BrandLogo";

type ProductNavLink = {
  href: string;
  label: string;
};

type ProductHeaderProps = {
  ariaLabel: string;
  links: ProductNavLink[];
  action?: ProductNavLink;
};

type ProductFooterProps = {
  lines: ReactNode[];
};

type ProductIntroProps = {
  eyebrow: string;
  statement: ReactNode;
  shell?: boolean;
};

export function ProductHeader({ ariaLabel, links, action }: ProductHeaderProps) {
  return (
    <header className="shell site-header cc-site-header cc-product-header">
      <a className="cc-brand-link" href="/" aria-label="Casa con Criterio · inicio">
        <BrandLogo width={230} priority />
      </a>
      {links.length > 0 ? (
        <nav className="cc-product-nav" aria-label={ariaLabel}>
          {links.map((link) => (
            <a className="nav-link" href={link.href} key={`${link.href}-${link.label}`}>
              {link.label}
            </a>
          ))}
        </nav>
      ) : null}
      {action ? (
        <a className="button button-primary cc-product-header__action" href={action.href}>
          {action.label}
        </a>
      ) : null}
    </header>
  );
}

export function ProductFooter({ lines }: ProductFooterProps) {
  return (
    <footer className="shell site-footer cc-footer cc-product-footer">
      <BrandLogo width={185} />
      {lines.map((line, index) => (
        <p key={index}>{line}</p>
      ))}
    </footer>
  );
}

export function ProductIntro({ eyebrow, statement, shell = false }: ProductIntroProps) {
  const content = (
    <section className="cc-route-intro">
      <p className="eyebrow">{eyebrow}</p>
      <p className="cc-commercial-line">{statement}</p>
    </section>
  );

  return shell ? <div className="shell">{content}</div> : content;
}
