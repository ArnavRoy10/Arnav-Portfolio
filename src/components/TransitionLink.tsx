import React from "react";
import { Link, LinkProps } from "react-router-dom";
import { navigateWithTransition } from "../helpers/navigateWithTransition";

type TransitionLinkProps = Omit<LinkProps, "to"> & {
  to: string;
  /** Text shown on the curtain while the page changes. */
  label?: string;
};

/** A router link that plays the page-curtain transition before navigating. */
export const TransitionLink = React.forwardRef<
  HTMLAnchorElement,
  TransitionLinkProps
>(({ to, label, onClick, target, ...props }, ref) => {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (target && target !== "_self") return;
    event.preventDefault();
    navigateWithTransition(to, label);
  };

  return (
    <Link ref={ref} to={to} target={target} onClick={handleClick} {...props} />
  );
});

TransitionLink.displayName = "TransitionLink";
