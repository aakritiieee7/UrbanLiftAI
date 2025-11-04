import { memo } from "react";
import Navbar from "@/components/Navbar";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = memo(({ children }: LayoutProps) => {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
});

Layout.displayName = "Layout";

export default Layout;