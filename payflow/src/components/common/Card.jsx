import React from "react";

const Card = ({ children, className = "", hover = false }) => {
  const hoverClasses = hover
    ? "hover:shadow-card-hover transition-shadow cursor-pointer"
    : "";

  return <div className={`card ${hoverClasses} ${className}`}>{children}</div>;
};

export default Card;
