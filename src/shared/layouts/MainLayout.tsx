import React from "react";
import { Outlet } from "react-router-dom";
import Menu from "../../shared/components/Sidebar/Menu";
import MobileBlocker from "shared/components/MobileBlocker/MobileBlocker";

const MainLayout = () => {
  return (
    <div className="appShell">
      <MobileBlocker />
      <Menu />
      <div className="appContent">
        <Outlet /> // 실제 앱 콘텐트가 보일 곳
      </div>
    </div>
  );
};

export default MainLayout;
