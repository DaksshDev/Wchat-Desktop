import { FC, ReactNode, useEffect } from "react";
import { Titlebar } from "../Titlebar";

export interface ILayout {
  children: ReactNode;
}

export const Layout: FC<ILayout> = ({ children }) => {
  return (
    <>
      <Titlebar />
      <div className="rounded-lg">{children}</div>
    </>
  );
};
