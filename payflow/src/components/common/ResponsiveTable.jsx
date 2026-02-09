import React from "react";

/**
 * ResponsiveTable - Wrapper component for tables that enables horizontal scrolling on mobile
 * while maintaining full width on desktop
 * @param {Object} props
 * @param {React.ReactNode} props.children - Table element to wrap
 * @param {string} props.className - Additional CSS classes
 */
const ResponsiveTable = ({ children, className = "" }) => {
  return (
    <div className={`overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-0 ${className}`}>
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ResponsiveTable;
